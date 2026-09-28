const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'varejo@ethereal.email',
                pass: process.env.SMTP_PASS || 'secret'
            }
        });
    }

    async sendActivationEmail(toEmail, socioName, code) {
        console.log(`\n======================================================`);
        console.log(`[EMAIL ACTIVATION CODE] Sócio: ${socioName} (${toEmail}) => CÓDIGO: ${code}`);
        console.log(`======================================================\n`);

        const mailOptions = {
            from: '"VarejoPro - Clube do Sócio" <nao-responda@varejo.com.br>',
            to: toEmail,
            subject: `🔑 Seu Código de Ativação VarejoPro: ${code}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #10b981;">
                        <h1 style="color: #0f172a; margin: 0; font-size: 24px;">VarejoPro <span style="color: #10b981;">Clube do Sócio</span></h1>
                        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Ativação do seu cadastro de compras online</p>
                    </div>
                    <div style="padding: 24px 0; color: #334155;">
                        <p style="font-size: 16px;">Olá, <strong>${socioName}</strong>!</p>
                        <p>Recebemos sua solicitação para ativação do seu acesso à Loja Online de Produtos VarejoPro.</p>
                        <p>Utilize o código de confirmação abaixo para ativar sua conta e liberar suas compras:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; background: #ecfdf5; border: 2px dashed #10b981; padding: 12px 28px; border-radius: 10px;">
                                ${code}
                            </span>
                        </div>

                        <p style="font-size: 13px; color: #64748b;">Este código é válido por <strong>15 minutos</strong>. Se você não solicitou este cadastro, por favor desconsidere este e-mail.</p>
                    </div>
                    <div style="border-top: 1px solid #cbd5e1; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                        &copy; ${new Date().getFullYear()} VarejoPro - Todos os direitos reservados.
                    </div>
                </div>
            `
        };

        try {
            if (process.env.SMTP_HOST) {
                await this.transporter.sendMail(mailOptions);
            }
            return { success: true };
        } catch (err) {
            console.error('Erro ao enviar e-mail via SMTP:', err.message);
            return { success: true, simulated: true };
        }
    }
}

module.exports = new EmailService();
