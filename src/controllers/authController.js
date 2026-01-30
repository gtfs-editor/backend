import * as authService from '../services/auth/index.js';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        const result = await authService.loginUser({ email, password, ip, userAgent });
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const register = async (req, res, next) => {
    try {
        const { email, username, password, firstName, lastName } = req.body;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        const result = await authService.registerUser({
            email, username, password, firstName, lastName, ip, userAgent
        });
        res.status(201).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await authService.logoutUser(userId);
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await authService.getUserProfile(userId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await authService.updateUserProfile(userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        const token = req.token; // Assuming auth middleware attaches token or we extract it

        await authService.changePassword(userId, current_password, new_password, token);
        res.json({ success: true, message: "Password changes successfully" });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token, new_password } = req.body;
        const result = await authService.resetPassword(token, new_password);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};
