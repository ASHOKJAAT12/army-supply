class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach((el) => {
            delete queryObj[el];
        });

        // Advanced filtering config for gte, gt, lte, lt if needed
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }

    search(fieldsToSearch) {
        if (this.queryString.search && fieldsToSearch.length > 0) {
            const searchRegex = new RegExp(this.queryString.search, 'i');
            const searchConditions = fieldsToSearch.map(field => ({
                [field]: searchRegex
            }));

            this.query = this.query.find({ $or: searchConditions });
        }
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 20;
        const skip = (page - 1) * limit;

        this.page = page;
        this.limit = limit;
        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
