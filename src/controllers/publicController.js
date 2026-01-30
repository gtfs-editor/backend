import * as publicService from '../services/public/index.js';

export const getRoute = async (req, res, next) => {
    try {
        const { number, dir } = req.query;
        const result = await publicService.getPublicRoute(number, dir);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
