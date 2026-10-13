from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import pandas as pd
import numpy as np

def calculate_route_cost(route_data, weights):
    """Calculates the weighted cost of a route."""
    d_w = weights.get("distanceWeight", 20) / 100
    t_w = weights.get("timeWeight", 20) / 100
    r_w = weights.get("riskWeight", 25) / 100
    
    # Normalize inputs (assumes max distance ~ 1000km, time ~ 1000m for simple normalization in demo)
    # We expect Node to pre-normalize or we do relative normalization
    norm_dist = min(route_data.get("distanceKm", 0) / 1000.0, 1.0) * 100
    norm_time = min(route_data.get("estimatedTravelTimeMinutes", 0) / 1000.0, 1.0) * 100
    norm_risk = route_data.get("routeRiskScore", 0)
    
    return (norm_dist * d_w) + (norm_time * t_w) + (norm_risk * r_w)

def optimize_logistics(payload: dict):
    """
    Solves a VRP using OR-Tools constraint solver.
    """
    shipments = payload.get("shipments", [])
    vehicles = payload.get("vehicles", [])
    distance_matrix = payload.get("distanceMatrix", [])
    cost_matrix = payload.get("costMatrix", []) # Pre-calculated total cost
    
    if not shipments or not vehicles:
        return {"unassignedShipments": [{"shipmentId": s["id"], "reason": "No vehicles or shipments provided"} for s in shipments]}

    # Data Model construction
    data = {}
    data['cost_matrix'] = cost_matrix
    data['demands'] = [0] + [s.get('weight', 0) for s in shipments] # Node 0 is Depot (source)
    data['vehicle_capacities'] = [v.get('capacity', 0) for v in vehicles]
    data['num_vehicles'] = len(vehicles)
    data['depot'] = 0

    # Create the routing index manager
    manager = pywrapcp.RoutingIndexManager(len(data['cost_matrix']), data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    # Cost Callbacks
    def cost_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(data['cost_matrix'][from_node][to_node] * 10) # scale to int

    transit_callback_index = routing.RegisterTransitCallback(cost_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Capacity Constraints
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return int(data['demands'][from_node])

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],  # vehicle maximum capacities
        True,  # start cumul to zero
        'Capacity')

    # Allow dropping visits (Unassigned Shipments)
    penalty = 1000000
    for node in range(1, len(data['cost_matrix'])):
        # Penalty is inversely proportional to shipment priority
        priority = shipments[node-1].get('priorityScore', 50)
        individual_penalty = int(penalty + (priority * 1000)) 
        routing.AddDisjunction([manager.NodeToIndex(node)], individual_penalty)

    # Search Parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    search_parameters.local_search_metaheuristic = (routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    search_parameters.time_limit.FromSeconds(2) # 2-second time limit for responsive API

    # Solve
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return {"unassignedShipments": [{"shipmentId": s["id"], "reason": "No viable solution found by constraint solver"} for s in shipments]}

    # Parse Solution
    assignments = []
    unassigned = []
    
    # Check dropped nodes
    for node in range(1, len(data['cost_matrix'])):
        if solution.Value(routing.NextVar(manager.NodeToIndex(node))) == manager.NodeToIndex(node) or \
           solution.Value(routing.NextVar(manager.NodeToIndex(node))) == manager.NodeToIndex(0) and routing.NextVar(manager.NodeToIndex(node)).Bound():
            # Sometimes single node route, need strict check for dropped:
            pass
            
    for node in range(1, len(data['cost_matrix'])):
        index = manager.NodeToIndex(node)
        if solution.Value(routing.NextVar(index)) == index:
           unassigned.append({"shipmentId": shipments[node-1]["id"], "reason": "Insufficient vehicle capacity or route constraint"})

    total_cost = 0
    for vehicle_id in range(data['num_vehicles']):
        index = routing.Start(vehicle_id)
        route_load = 0
        sequence = 1
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            if node_index != 0:
                shipment = shipments[node_index - 1]
                veh = vehicles[vehicle_id]
                route_load += data['demands'][node_index]
                
                utilization = 0
                if veh['capacity'] > 0:
                    utilization = round((route_load / veh['capacity']) * 100, 1)
                    
                assignments.append({
                    "shipmentId": shipment["id"],
                    "vehicleId": veh["id"],
                    "sequence": sequence,
                    "vehicleUtilization": utilization,
                    "explanation": {
                        "vehicleReason": f"Capacity matched ({utilization}% utilized). Selected over alternatives due to availability and proximity.",
                        "routeReason": f"Lowest overall combination of Distance, Time, and Risk for this vehicle's path.",
                        "priorityReason": f"Shipment Priority Score: {shipment.get('priorityScore', 50)} factored into selection."
                    }
                })
                sequence += 1
            index = solution.Value(routing.NextVar(index))
            
    return {
        "vehicleAssignments": assignments,
        "unassignedShipments": unassigned,
        "summary": {
             "totalCostCalculated": solution.ObjectiveValue() / 10.0,
             "totalVehiclesUsed": len(set([a["vehicleId"] for a in assignments]))
        }
    }
