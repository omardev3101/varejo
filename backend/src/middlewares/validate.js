const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        // Update req objects to include coerced or default values from Zod
        req.body = parsed.body || req.body;
        req.query = parsed.query || req.query;
        req.params = parsed.params || req.params;

        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos na requisição',
                details: error.errors.map(e => ({
                    campo: e.path[e.path.length - 1],
                    mensagem: e.message
                }))
            });
        }
        next(error);
    }
};

module.exports = validate;
