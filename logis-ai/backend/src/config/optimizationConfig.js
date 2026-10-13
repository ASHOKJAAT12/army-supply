const optimizationConfig = {
    defaultWeights: {
        distanceWeight: 20,
        timeWeight: 20,
        riskWeight: 25,
        delayWeight: 20,
        efficiencyWeight: 5,
        priorityWeight: 10
    },
    presets: {
        balanced: {
            distanceWeight: 20,
            timeWeight: 20,
            riskWeight: 25,
            delayWeight: 20,
            efficiencyWeight: 5,
            priorityWeight: 10
        },
        fastest: {
            distanceWeight: 10,
            timeWeight: 50,
            riskWeight: 10,
            delayWeight: 20,
            efficiencyWeight: 0,
            priorityWeight: 10
        },
        lowestRisk: {
            distanceWeight: 10,
            timeWeight: 10,
            riskWeight: 60,
            delayWeight: 10,
            efficiencyWeight: 0,
            priorityWeight: 10
        },
        shortestDistance: {
            distanceWeight: 60,
            timeWeight: 10,
            riskWeight: 10,
            delayWeight: 10,
            efficiencyWeight: 0,
            priorityWeight: 10
        }
    }
};

module.exports = optimizationConfig;
