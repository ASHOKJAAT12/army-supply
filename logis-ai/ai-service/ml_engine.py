import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, mean_absolute_percentage_error
from xgboost import XGBRegressor
from bson import ObjectId

class MLEngine:
    
    @staticmethod
    def get_historical_data(db, location_id: str, item_id: str) -> pd.DataFrame:
        """
        Fetches consumption records from MongoDB, converts to pandas DataFrame.
        """
        if not db:
            raise Exception("Database connection not provided.")
            
        consumptions = list(db.consumptions.find({
            "location": ObjectId(location_id),
            "item": ObjectId(item_id)
        }))
        
        if not consumptions:
            return pd.DataFrame()
            
        df = pd.DataFrame(consumptions)
        df['date'] = pd.to_datetime(df['date'])
        
        # Remove anomalies/invalid records (negative quantity, null date)
        df = df[df['quantity'] >= 0]
        df = df.dropna(subset=['date', 'quantity'])
        
        return df

    @staticmethod
    def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates data to daily frequency and generates ML features.
        Zero-fill strategy is used for missing dates assuming no consumption occurred.
        """
        if df.empty:
            return df
            
        # Daily aggregation
        df = df.groupby(df['date'].dt.date)['quantity'].sum().reset_index()
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        
        # Create continuous date range and fill missing with 0
        idx = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
        df = df.reindex(idx, fill_value=0)
        df = df.rename_axis('date').reset_index()
        
        # We need at least enough data to build lag features
        # Add basic calendar features
        df['dayOfWeek'] = df['date'].dt.dayofweek
        df['dayOfMonth'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        
        # Add lag features
        df['lag1'] = df['quantity'].shift(1)
        df['lag3'] = df['quantity'].shift(3)
        df['lag7'] = df['quantity'].shift(7)
        df['lag14'] = df['quantity'].shift(14)
        
        # Add rolling features (must shift to avoid predicting using current data)
        df['rollingMean3'] = df['quantity'].shift(1).rolling(window=3).mean()
        df['rollingMean7'] = df['quantity'].shift(1).rolling(window=7).mean()
        df['rollingMean14'] = df['quantity'].shift(1).rolling(window=14).mean()
        df['rollingStd7'] = df['quantity'].shift(1).rolling(window=7).std()
        
        # Drop rows with NaN (which will be at least the first 14 rows due to lag14)
        df = df.dropna().copy()
        return df

    @staticmethod
    def train_evaluate(df: pd.DataFrame):
        """
        Performs chronological split, trains a Baseline (7-Day SMA) and XGBoost.
        Returns evaluation metrics and selects the best/appropriate model.
        """
        # If insufficient data after feature eng (e.g. < 20 days), fail ML and rely on pure fallback
        if len(df) < 20:
            return {
                "status": "insufficient_data",
                "message": "Not enough historical data points after feature extraction."
            }
            
        # Chronological Split (approx 80/20 train/test since we want continuous)
        split_idx = int(len(df) * 0.8)
        train = df.iloc[:split_idx]
        test = df.iloc[split_idx:]
        
        if len(test) == 0:
            return {"status": "insufficient_data"}
            
        features = ['dayOfWeek', 'dayOfMonth', 'month', 'lag1', 'lag3', 'lag7', 'lag14', 
                   'rollingMean3', 'rollingMean7', 'rollingMean14', 'rollingStd7']
                   
        X_train, y_train = train[features], train['quantity']
        X_test, y_test = test[features], test['quantity']
        
        # Baseline: 7-day Simple Moving Average (rollingMean7 already shifted properly)
        baseline_pred = test['rollingMean7']
        baseline_mae = mean_absolute_error(y_test, baseline_pred)
        baseline_rmse = root_mean_squared_error(y_test, baseline_pred)
        
        # Train XGBoost
        xgb_model = XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42)
        xgb_model.fit(X_train, y_train)
        
        xgb_pred = xgb_model.predict(X_test)
        xgb_mae = mean_absolute_error(y_test, xgb_pred)
        xgb_rmse = root_mean_squared_error(y_test, xgb_pred)
        
        # Calculate MAPE (safely handle zero-demand in real-world scenarios)
        # Adding a small epsilon to denominator to prevent ZeroDivisionError
        eps = 1e-8
        baseline_mape = np.mean(np.abs((y_test - baseline_pred) / (y_test + eps))) * 100
        xgb_mape = np.mean(np.abs((y_test - xgb_pred) / (y_test + eps))) * 100

        # Choose the best model logic. Generally prefer XGBoost if dataset is robust and it performs similarly or better
        # For prototype, we default to xgboost if it succeeds, but warn if baseline is vastly superior
        model_used = "xgboost" if xgb_mae <= (baseline_mae * 1.2) else "moving_average"
        
        # Compute feature importance for explainability
        importance = dict(zip(features, map(float, xgb_model.feature_importances_)))
        
        # Re-train on FULL df to prepare for future inference
        final_xgb = XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42)
        final_xgb.fit(df[features], df['quantity'])
        
        return {
            "status": "ready",
            "model_used": model_used,
            "training_samples": len(train),
            "test_samples": len(test),
            "baseline_mae": round(baseline_mae, 2),
            "baseline_rmse": round(baseline_rmse, 2),
            "baseline_mape": round(baseline_mape, 2),
            "xgboost_mae": round(xgb_mae, 2),
            "xgboost_rmse": round(xgb_rmse, 2),
            "xgboost_mape": round(xgb_mape, 2),
            "feature_importance": importance,
            "model": final_xgb,      # For in-memory usage
            "latest_data": df.tail(15) # Keep context for iterative prediction easily
        }

    @staticmethod
    def recursive_predict(model, recent_df: pd.DataFrame, horizon: int) -> list:
        """
        Recursively predicting forward. 
        Note: `recent_df` needs to hold the last 15 days of actuals to construct the initial features.
        """
        # Create a working copy containing dates and quantities
        working_series = list(recent_df['quantity'].values)
        last_date = recent_df['date'].iloc[-1]
        
        predictions = []
        
        features_list = ['dayOfWeek', 'dayOfMonth', 'month', 'lag1', 'lag3', 'lag7', 'lag14', 
                         'rollingMean3', 'rollingMean7', 'rollingMean14', 'rollingStd7']
                         
        for i in range(horizon):
            current_date = last_date + pd.Timedelta(days=i+1)
            
            # Construct features from the `working_series` manually to match what Pandas rolling did
            s = pd.Series(working_series)
            
            # The "current" values before the new day is predicted
            lag1 = s.iloc[-1]
            lag3 = s.iloc[-3] if len(s) >= 3 else lag1
            lag7 = s.iloc[-7] if len(s) >= 7 else lag1
            lag14 = s.iloc[-14] if len(s) >= 14 else lag7
            
            rMean3 = s.iloc[-3:].mean()
            rMean7 = s.iloc[-7:].mean()
            rMean14 = s.iloc[-14:].mean()
            rStd7 = s.iloc[-7:].std() if len(s) >= 7 else 0.0
            
            if pd.isna(rStd7):
                rStd7 = 0.0

            row = pd.DataFrame([{
                'dayOfWeek': current_date.dayofweek,
                'dayOfMonth': current_date.day,
                'month': current_date.month,
                'lag1': lag1,
                'lag3': lag3,
                'lag7': lag7,
                'lag14': lag14,
                'rollingMean3': rMean3,
                'rollingMean7': rMean7,
                'rollingMean14': rMean14,
                'rollingStd7': rStd7
            }])[features_list]
            
            # Predict
            if isinstance(model, XGBRegressor):
                pred = float(model.predict(row)[0])
            else:
                # moving_average fallback
                pred = float(rMean7)
                
            pred = max(0.0, pred) # clip at 0
            
            # Append prediction to our working series so the next day's lags contain this prediction
            working_series.append(pred)
            
            predictions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "predictedDemand": round(pred, 2)
            })
            
        return predictions

    @staticmethod
    def simple_baseline_predict(df: pd.DataFrame, horizon: int) -> list:
        """
        Pure fallback: If dataset is < 20 rows, we just project a 7-day flat moving average
        to guarantee we provide a forecast even for sparse new items.
        """
        if df.empty:
            return [{"date": (pd.Timestamp.now() + pd.Timedelta(days=i+1)).strftime("%Y-%m-%d"), "predictedDemand": 0.0} for i in range(horizon)]
            
        recent_qty = df['quantity'].tail(7).mean()
        if pd.isna(recent_qty):
            recent_qty = 0.0
            
        last_date = pd.to_datetime(df['date'].iloc[-1])
        
        predictions = []
        for i in range(horizon):
            current_date = last_date + pd.Timedelta(days=i+1)
            predictions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "predictedDemand": round(recent_qty, 2)
            })
            
        return predictions
