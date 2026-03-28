const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { knex } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'autotesteai-super-secret-key-2026';

async function login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password obrigatórios' });

    try {
        const user = await knex('AdminUsers').where({ username }).first();
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return res.status(401).json({ error: 'Credenciais inválidas' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            token,
            needsPasswordChange: user.needsPasswordChange
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
}

async function changePassword(req, res) {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) return res.status(400).json({ error: 'Preencha todos os campos' });

    try {
        const user = await knex('AdminUsers').where({ username }).first();
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

        const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isValid) return res.status(401).json({ error: 'Senha atual incorreta' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await knex('AdminUsers').where({ id: user.id }).update({
            passwordHash: newHash,
            needsPasswordChange: false
        });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, needsPasswordChange: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token mal formatado' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido ou expirado' });
        req.user = decoded;
        next();
    });
}

async function verify(req, res) {
    // If reached here, authMiddleware passed
    try {
        const user = await knex('AdminUsers').where({ id: req.user.id }).first();
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

        res.json({
            valid: true,
            needsPasswordChange: user.needsPasswordChange
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
}

module.exports = {
    login,
    changePassword,
    authMiddleware,
    verify
};
