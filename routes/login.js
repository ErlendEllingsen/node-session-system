// example login file

const fs = require('fs');
const express    = require('express');
const uuid = require('uuid/v1');
const validator = require("email-validator");

// db
const TYPES = require('tedious').TYPES;
const Request = require('tedious').Request;
const DBHelper = require('../modules/DBHelper');


const AppError = require('../modules/AppError');
const config = require('../modules/Config');

const Session = require('../modules/Session');
const sessionMgr = require('../modules/SessionManager');

const authMiddleware = require('../middlewares/authMiddleware');

class LoginRoutes {
    constructor(app) {
        // init router 
        this.router = express.Router();
        app.use('/api/login', this.router);

        // set default values
        this.queries = {};

        // bind methods
        this.generateToken = this.generateToken.bind(this);

        // load queries
        this.loadQueries();
            
        // setup routes
        this.setupRoutes();
    }

    loadQueries() {
        config.queryLoader.loadQuery('login', 'queries/login/login.sql');
    }

    setupRoutes() {
        const r = this.router;
        
        // pre login barrier
        r.get('/status', this.getStatus);
        r.post('/generateToken', this.generateToken);
        // login mw
        r.use(authMiddleware);
        // post login barrier
        r.get('/inside', this.getInside);
    }

    /** POST ROUTES */
    generateToken(req, res) {
        const {email} = req.body;

        // Promise Validate form 
        new Promise((resolve, reject) => {
            // Validate input data and form
            if (email === undefined) return reject('missing field email');
            if (!validator.validate(email)) return reject(new AppError('invalid email format'));
            return resolve(true);
        })
        // find user in database, fetch session 
        .then((result) => {
            return new Promise((resolve, reject) => {
                const loginQuery = config.queryLoader.getQuery('login');
                const loginReq = new Request(loginQuery, ((err, rowCount, rows ) => {
                    if (rowCount === 0) return reject(new AppError('no valid user found'));

                    const usrRow = rows[0];
                    const rowObj = DBHelper.getObjectFromRow(usrRow);
                    
                    // get session from email (returns null on not found)
                    return resolve(
                        new Promise((resolve, reject) => {
                            sessionMgr.getSessionFromEmail(rowObj.Email)
                            .then((session) => {
                                return resolve({ session, rowObj });
                            })
                            .catch((err) => {
                                return reject(err);
                            })
                        })
                    );
                }));

                loginReq.addParameter('email', TYPES.VarChar, email);
                config.sql.execSql(loginReq);
            });
        })
        // create new session if not present in database
        .then((lookupRes) => {
            const {session, rowObj} = lookupRes;
            return new Promise((resolve, reject) => {
                if (session instanceof Session) {
                    // Session was found, return
                    return resolve(session); 
                } 

                // session not found, create and return new 
                const newSession = new Session(rowObj);
                sessionMgr.saveSession(newSession)
                .then((res) => {
                    return resolve(newSession);
                })
                .catch((err) => {
                    return reject(err);
                })
            });
        })
        .then((session) => {

            // send refresh action but dont care for its response
            session.refreshSilent();

            res.statusCode = 200;
            res.json({
                status: true, 
                message: session.token
            });
            return;
        })
        .catch((reason) => {
            const errMsg = (reason.message !== undefined ? reason.message : reason); 

            // Check if application error
            if (reason instanceof AppError) {
                res.statusCode = 400;
                res.json({
                    status: false, 
                    message: reason.message
                });
                return;
            } 

            // Error is deeper / more severe
            console.error(`[${new Date().toLocaleString()}] Error occured in generateToken`);
            console.error(reason);
            res.statusCode = 500; 
            res.json({
                status: false, 
                message: errMsg
            });
            return;
        });
     
        // end generateToken
    }

    /** GET ROUTES */
    getStatus(req, res) {
        res.statusCode = 200;
        res.json({
            status: true,
            message: 'hello'
        })
        return;
    }

    getInside(req, res) {
        res.statusCode = 200;
        res.json({
            status: true,
            message: 'hello, you are inside',
            user: {
                token: req.appToken,
                session: req.appSession
            }
        })
        return;
    }

}

module.exports = LoginRoutes;
