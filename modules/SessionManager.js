// --- get shared config ---
const config = require('./Config');

const AppError = require('./AppError');
const Session = require('./Session');

module.exports = new (class SessionManager {

    constructor() {
        this.sessionLifeTime = 2 * 60; // in minutes 
    }

    getSession(token) {
        if (config.mongodb === null) throw new Error("mongodb is null");

        return new Promise((resolve, reject) => {
            config.mongodb.collection('sessions').findOne({
                token: token
            })
            .then((result) => {
                return resolve(result);
            })
            .catch((err) => {
                return reject(err);
            })
        });

        // end getSession
    }

    getActiveSession(token) {
        return new Promise((resolve, reject) => {

            this.getSession(token)
            .then((sessionRaw) => {
                if (sessionRaw === null) return reject(new AppError('invalid session'));
                const session = this.getSessionFromRaw(sessionRaw);
                if (session.getExpired()) {
                    session.deactivateSilent();
                    return reject(new AppError('session is expired'));
                }
                return resolve(session);
            })
            .catch((err) => {
                console.error(err);
            })

        });
        
    }

    getSessionFromEmail(email) {
        return new Promise((resolve, reject) => {
            if (config.mongodb === null) return reject(new Error("mongodb is null"));
            config.mongodb.collection('sessions').find({
                "researchUser.Email": email,
                "archived": { $ne: true }
            }).toArray((err, results) => {
                if (err !== null) {
                    console.error(err);
                    return reject(new Error("unexpected err value from session collection"));
                }
                if (results.length === 0) return resolve(null);
                const sessionRaw = results[0];
                const session = this.getSessionFromRaw(sessionRaw);

                // return null if session has expired 
                if (session.getExpired()) {
                    return resolve(null);
                } 

                return resolve(session);
            });
        });
        
    }

    saveSession(session) {
        return new Promise((resolve, reject) => {
            if (config.mongodb === null) return reject(new Error("mongodb is null"));
            config.mongodb.collection('sessions').insertOne(session)
            .then((res) => {
                return resolve(res);
            })
            .catch((err) => {
                return reject(err);
            })
            
        });

    }

    getSessionFromRaw(raw) {
        return new Session(raw.researchUser, raw.token, false, raw.archived);
    }

    

})();
