// POSTGRE POOL
var { Pool } = require('pg');

module.exports = () => {
    // POOL CONFIG
    let pool = new Pool({
        user: 'znwlgtyokmmlib',
        password: '1ffec3418bd9f183fea2bcc6fb638b3bf25581fe2009e434948662d1eed6ea3d',
        host: 'ec2-107-21-201-238.compute-1.amazonaws.com',
        port: 5432,
        database: 'd45ot7o72oqdft',
        max: 20,
        idleTimeoutMillis: 30000,
        ssl: true
    });

    return pool;
};