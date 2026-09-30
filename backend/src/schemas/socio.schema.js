const { z } = require('zod');

const registerSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, 'CPF ou Matrícula é obrigatório'),
        email: z.string().email('Formato de e-mail inválido'),
        password: z.string().min(6, 'A senha deve conter pelo menos 6 caracteres'),
        phone: z.string().optional(),
        address: z.string().optional(),
        number: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip_code: z.string().optional(),
        garage: z.string().optional(),
        authorized_persons: z.array(
            z.object({
                name: z.string(),
                relation: z.string().optional()
            }).passthrough()
        ).optional()
    }).passthrough()
});

const loginSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, 'CPF ou Matrícula é obrigatório'),
        password: z.string().min(1, 'Senha é obrigatória')
    }).passthrough()
});

module.exports = {
    registerSchema,
    loginSchema
};
