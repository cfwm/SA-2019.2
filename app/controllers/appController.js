// LOGIN FUNCTION
var login = require('../../config/auth').login,
    // DATABASE POOL
    pool = require('../../config/database')(),
    // NODEMAILER TRANSPORTER
    transporter = require('../../config/mailer')();

module.exports = () => {
    // CONTROLLER
    let controller = {
        // LOGIN
        userLogin(req, res) {
            // USER DATA
            let jsonData = req.body;
            login(jsonData.name, jsonData.password, result => {
                // CHECK RESULT
                if (result) {
                    res.send(result);
                }
                // ON ERROR => RESPONSE UNAUTHORIZED 401
                else {
                    res.status(401).json({ message: 'Erro de Autenticação' });
                }
            });
        },
        // GET USERS FUNCTION => /available = post
        isAvailable(req, res) {
            // USER DATA
            let jsonData = req.body,
                // RESPONSE TEMPLATE
                respTemplate = [];
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY => CHECK IF user_name IS UNIQUE
                    client.query("SELECT * FROM users WHERE user_name = $1", [jsonData.name])
                        // ON SUCCESS
                        .then(result => {
                            // IF NOT UNIQUE respTemplate PUSH A MESSAGE
                            if (result.rowCount > 0) {
                                respTemplate.push('O nome de usuário já está em uso');
                            }
                            // SELECT QUERY => CHECK IF user_email IS UNIQUE
                            client.query("SELECT * FROM users WHERE user_email = $1", [jsonData.email])
                                // ON SUCCESS
                                .then(result => {
                                    // IF NOT UNIQUE respTemplate PUSH A MESSAGE
                                    if (result.rowCount > 0) {
                                        respTemplate.push('O e-mail já está em uso');
                                    }
                                    // RESPONSE OK 200
                                    res.status(200).json({ respTemplate });
                                })
                                // ON ERROR => RESPONSE BAD REQUEST 400
                                .catch(err => res.status(400).json({ message: err.message }))
                                // DISCONNECTING TO THE DATABASE
                                .finally(() => client.release());
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => {
                            res.status(400).json({ message: err.message });
                            // DISCONNECTING TO THE DATABASE
                            client.release();
                        })
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // CREATE A NEW USER FUNCTION => /register => post
        createUser(req, res) {
            // USER DATA
            let jsonData = req.body,
                _latLng = jsonData.coordinates.split(','),
                latLng = `${_latLng[1]} ${_latLng[0]}`;
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // INSERT QUERY => CREATE A NEW USER
                    client.query(`INSERT INTO users (user_name, user_password, user_email, user_address, user_coordinates, geom) VALUES($1, MD5($2), $3, $4, $5, ST_GeomFromText('Point(${latLng})',4326))`, [jsonData.name, jsonData.password, jsonData.email, jsonData.address, jsonData.coordinates])
                        // ON SUCCESS => RESPONSE OK 200
                        .then(() => res.status(200).json({ title: 'Obrigado por se cadastrar', message: 'Seus dados foram cadastrados com sucesso.' }))
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // CHECK IF THE user_email EXISTS => /registered => post
        isRegistered(req, res) {
            // USER DATA
            let jsonData = req.body,
                // RESPONSE TEMPLATE
                respTemplate = [];
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY => CHECK IF THE user_email EXISTS
                    client.query("SELECT * FROM users WHERE user_email = $1", [jsonData.email])
                        // ON SUCCESS
                        .then(result => {
                            // IF THE user_email NOT EXISTS
                            if (result.rowCount === 0) {
                                respTemplate.push('O e-mail informado não está cadastrado');
                            }
                            // RESPONSE OK 200
                            res.status(200).json({ respTemplate });
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // RECOVER USER => /recover => post
        recoverUser(req, res) {
            // USER DATA
            let jsonData = req.body,
                // RANDOM PASSWORD
                new_password = Math.random().toString(36).substring(2, 10);
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // UPDATE QUERY => UPDATE USER PASSWORD
                    client.query("UPDATE users SET user_password = MD5($1) WHERE user_email = $2", [new_password, jsonData.email])
                        // ON SUCCESS
                        .then(() => {
                            client.query("SELECT user_name FROM users WHERE user_email = $1", [jsonData.email])
                                .then(result => {
                                    // E-MAIL OPTIONS
                                    let mailOptions = {
                                        from: 'appmica.contato@gmail.com',
                                        to: jsonData.email,
                                        subject: 'Mapa Interativo e Colaborativo Ambiental - Recuperação de Cadastro',
                                        text: `Esta é uma mensagem automática por favor não responda.\n\nVocê solicitou uma recuperação de cadastro para o Mapa Interativo e Colaborativo Ambiental (MICA). Os dados cadastrados para este e-mail são:\n\nNome de usuário: ${result.rows[0].user_name}\nSenha: ${new_password}\n\nAtenciosamente,\nMICA`
                                    };
                                    // E-MAIL FUNCTION
                                    transporter.sendMail(mailOptions, error => {
                                        if (error) {
                                            // ON ERROR => RESPONSE BAD REQUEST 400
                                            res.status(400).json({ message: error });
                                        } else {
                                            // RESPONSE OK 200
                                            res.status(200).json({ title: 'Por favor verifique seu e-mail', message: 'Os seus dados de cadastro foram atualizados e enviados para o seu e-mail.' });
                                        }
                                    });
                                })
                                // ON ERROR => RESPONSE BAD REQUEST 400
                                .catch(err => res.status(400).json({ message: err.message }))
                                // DISCONNECTING TO THE DATABASE
                                .finally(() => client.release());
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => {
                            res.status(400).json({ message: err.message })
                            // DISCONNECTING TO THE DATABASE
                            client.release();
                        })
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }))
        },
        // CHECK IF THE TOKEN IS VALID => /authenticated => get
        isAuthenticated(req, res) {
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY
                    client.query("SELECT NOW()")
                        // ON SUCCESS
                        .then(() => res.status(200).json({ authenticated: true }))
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // GET USER DATA => /data:id => get
        getUser(req, res) {
            // USER ID
            let id = req.params.id,
                // RESPONSE TEMPLATE
                respTemplate = {};
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY
                    client.query("SELECT * FROM users WHERE user_id = $1", [id])
                        // ON SUCCESS
                        .then(result => {
                            respTemplate = {
                                name: result.rows[0].user_name.trim(),
                                email: result.rows[0].user_email.trim(),
                                address: result.rows[0].user_address.trim(),
                                coordinates: result.rows[0].user_coordinates.trim()
                            };
                            // RESPONSE OK 200
                            res.status(200).json({ respTemplate });
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // UPDATE USER PASSWORD => /password => put
        setUserPassword(req, res) {
            // PASSWORD DATA
            let jsonData = req.body;
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // UPDATE QUERY
                    client.query("UPDATE users SET user_password = MD5($1) WHERE user_id = $2", [jsonData.new, jsonData.id])
                        // ON SUCCESS
                        .then(() => {
                            // RESPONSE OK 200
                            res.status(200).json({ title: 'Senha atualizada', message: 'Sua senha foi atualizada com sucesso.' })
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // GET USER DATA => /data:user => get
        setUserData(req, res) {
            // PASSWORD DATA
            let jsonData = req.body,
                _latLng = jsonData.coordinates.split(','),
                latLng = `${_latLng[1]} ${_latLng[0]}`;
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // UPDATE QUERY
                    client.query(`UPDATE users SET user_address = $1, user_coordinates = $2, geom = ST_GeomFromText('Point(${latLng})',4326) WHERE user_id = $3`, [jsonData.address, jsonData.coordinates, jsonData.id])
                        // ON SUCCESS
                        .then(() => {
                            // RESPONSE OK 200
                            res.status(200).json({ title: 'Dados atualizados', message: 'Seus dados foram atualizados com sucesso.' })
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // CREATE A NEW OCCURRENCE FUNCTION => /addoccurence => post
        createOccurrence(req, res) {
            // USER DATA
            let jsonData = req.body,
                _latLng = jsonData.coordinates.split(','),
                latLng = `${_latLng[1]} ${_latLng[0]}`;
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // INSERT QUERY => CREATE A NEW USER
                    client.query(`INSERT INTO occurrence (user_id, occurrence_type, occurrence_classification, occurrence_description, occurrence_address, occurrence_coordinates, geom, occurrence_date, occurrence_picture, occurrence_status) VALUES($1, $2, $3, $4, $5, $6, ST_GeomFromText('Point(${latLng})',4326), NOW(), $7, $8)`, [jsonData.userId, jsonData.type, jsonData.classification, jsonData.description, jsonData.address, jsonData.coordinates, jsonData.picture, jsonData.status])
                        // ON SUCCESS => RESPONSE OK 200
                        .then(() => res.status(200).json({ title: 'Obrigado por ajudar', message: 'A ocorrência foi cadastrada com sucesso.' }))
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // GET OCCURRENCE DATA => /occurrence:id => get
        getOccurrence(req, res) {
            // OCCURRENCE ID
            let id = req.params.id,
                // RESPONSE TEMPLATE
                respTemplate = {};
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY
                    client.query("SELECT * FROM occurrence WHERE occurrence_id = $1", [id])
                        // ON SUCCESS
                        .then(result => {
                            respTemplate = {
                                occurrence_id: result.rows[0].occurrence_id,
                                type: result.rows[0].occurrence_type.trim(),
                                classification: result.rows[0].occurrence_classification.trim(),
                                description: result.rows[0].occurrence_description.trim(),
                                address: result.rows[0].occurrence_address.trim(),
                                coordinates: result.rows[0].occurrence_coordinates.trim(),
                                date: result.rows[0].occurrence_date,
                                picture: result.rows[0].occurrence_picture,
                                user_id: result.rows[0].user_id
                            };
                            // RESPONSE OK 200
                            res.status(200).json({ respTemplate });
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // GET OCCURRENCE DATA => /occurrence => get
        getOccurrences(req, res) {
            // RESPONSE TEMPLATE
            let respTemplate = [];
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // SELECT QUERY
                    client.query("SELECT * FROM occurrence WHERE occurrence_status[1] = 0 ORDER BY occurrence_date")
                        // ON SUCCESS
                        .then(result => {
                            result.rows.map(item => {
                                respTemplate.push({
                                    occurrence_id: item.occurrence_id,
                                    user_id: item.user_id,
                                    type: item.occurrence_type.trim(),
                                    classification: item.occurrence_classification.trim(),
                                    coordinates: item.occurrence_coordinates.trim(),
                                    date: item.occurrence_date                                    
                                });
                            });
                            // RESPONSE OK 200
                            res.status(200).json({ respTemplate });
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // UPDATE OCCURRENCE STATUS => /rescue => put
        rescue(req, res) {
            // DATA
            let jsonData = req.body;
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // UPDATE QUERY
                    client.query("UPDATE occurrence SET occurrence_status = $1 WHERE occurrence_id = $2", [jsonData.status, jsonData.occurrenceId])
                        // ON SUCCESS
                        .then(() => {
                            // RESPONSE OK 200
                            res.status(200).json({ title: 'Remover ocorrência', message: 'Ocorrência removida.' })
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        },
        // FILTER OCCURRENCE => /filter => post
        filter(req, res) {
            // USER DATA
            let jsonData = req.body,
                _latLng = jsonData.coordinates.split(','),
                latLng = `${_latLng[1]} ${_latLng[0]}`,
                // RESPONSE TEMPLATE
                respTemplate = [];
            // CONNECTING TO THE DATABASE
            pool.connect()
                // ON SUCCESS => CONNECTED
                .then(client => {
                    // INSERT QUERY => CREATE A NEW USER
                    client.query(`SELECT * FROM occurrence WHERE occurrence_status[1] = 0 AND ST_Intersects(geom,ST_Buffer(ST_GeomFromText('Point(${latLng})',4326),$1)) AND occurrence_type = $2`, [jsonData.distance, jsonData.type])
                        // ON SUCCESS
                        .then(result => {
                            result.rows.map(item => {
                                respTemplate.push({
                                    occurrence_id: item.occurrence_id,
                                    type: item.occurrence_type.trim(),
                                    classification: item.occurrence_classification.trim(),
                                    coordinates: item.occurrence_coordinates.trim(),
                                    date: item.occurrence_date
                                });
                            });
                            // RESPONSE OK 200
                            res.status(200).json({ respTemplate });
                        })
                        // ON ERROR => RESPONSE BAD REQUEST 400
                        .catch(err => res.status(400).json({ message: err.message }))
                        // DISCONNECTING TO THE DATABASE
                        .finally(() => client.release());
                })
                // ON ERROR => RESPONSE BAD REQUEST 400
                .catch(err => res.status(400).json({ message: err.message }));
        }
    };

    return controller;
};