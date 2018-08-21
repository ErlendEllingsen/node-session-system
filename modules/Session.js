const uuid = require('uuid/v1');

const config = require('./Config');

// problematic require (SessionManager) is placed at bottom of this file.
module.exports = class Session {
    constructor(researchUser, token = undefined, setCreated = true, archived = false) {
        this.researchUser = researchUser;

        // generate token based on uuid v1 if not present 
        if (token === undefined) token = uuid();
        this.token = token;

        if (setCreated) {
            // set metadata
            const d = new Date();
            this.created = d;
            this.lastActive = d;
        }

        // set default values
        this.archived = archived;
    }

    getEmail() {
        return this.researchUser.Email;
    }

    getExpired() {
        // if the session is archived, always return true
        if (this.archived !== undefined && this.archived === true) return true;

        // calculate wether the token has expired
        const diff = (new Date() - this.lastActive);
        const timeoutMs = sessionMgr.sessionLifeTime * 60 * 1000; 
        if (diff > timeoutMs) return true;
        return false;  
    }

    deactivateSilent() {
        config.mongodb.collection('sessions').findOneAndUpdate(
            {
                token: this.token
            },
            {
                $set: {
                    archived: true
                } 
            }
        )
        .then((document) => {
        })
        .catch((err) => {
            console.error('Session deactivateSilent error');
            console.error(err);
        })
    }

    refreshSilent() {
        if (config.mongodb === null) return null;
        const d = new Date();
        this.lastActive = d;
        
        config.mongodb.collection('sessions').findOneAndUpdate(
            {
                token: this.token
            },
            {
                $set: {
                    lastActive: this.lastActive
                } 
            }
        )
        .then((document) => {
        })
        .catch((err) => {
            console.error('Session refreshSilent error');
            console.error(err);
        })

    }

}

const sessionMgr = require('./SessionManager');
