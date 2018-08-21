const AppError = require('../modules/AppError');

const sessionMgr = require('../modules/SessionManager');

module.exports = function authMiddleware(req, res, next) {
    const token = req.headers['fs-alpha-token'];
    if (token === undefined || token === '' || token.length !== 36) {
        res.statusCode = 400; 
        return res.json({
            status: false,
            authProblem: true,
            message: 'invalid token format'
        });
    }

    // validate token
    sessionMgr.getActiveSession(token)
    .then((session) => {
        req.appToken = token;
        req.appSession = session;
        next();
    })
    .catch((err) => {
        console.log(`[${new Date().toLocaleString()}] Invalid auth token ${token}`);
        // check if user problem
        if (err instanceof AppError) {
            res.statusCode = 403; 
            return res.json({
                status: false,
                authProblem: true,
                message: 'auth invalid'
            });
        }
        console.error('auth middlware err');
        console.error(err);
        res.statusCode = 500;
        return res.json({
            status: false,
            authProblem: true,
            message: 'unknown error'
        })
    });


};
