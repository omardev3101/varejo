/**
 * Utility to sanitize backend database errors and system tracebacks
 * into clean, user-friendly Portuguese error messages.
 */
function sanitizeErrorMessage(error) {
    if (!error) return 'Ocorreu um erro inesperado no servidor.';
    
    const msg = typeof error === 'string' ? error : (error.message || '');

    // Foreign key / database parent row errors
    if (
        msg.includes('foreign key constraint fails') || 
        msg.includes('FOREIGN KEY') || 
        msg.includes('parent row') || 
        msg.includes('ER_ROW_IS_REFERENCED') ||
        msg.includes('product_return_items')
    ) {
        return 'Não foi possível concluir a ação pois existem registros vinculados a estes dados no sistema (como vendas, devoluções ou estoque).';
    }

    // Duplicate entry / unique key errors
    if (msg.includes('ER_DUP_ENTRY') || msg.includes('Duplicate entry') || msg.includes('unique constraint')) {
        return 'Este registro já está cadastrado no sistema.';
    }

    // Raw SQL / Sequelize Database Errors
    if (
        error.name === 'SequelizeDatabaseError' || 
        msg.includes('SequelizeDatabaseError') ||
        msg.includes('SyntaxError') || 
        msg.includes('sqlState') ||
        msg.includes('WHERE')
    ) {
        return 'Ocorreu um erro ao processar os dados no banco de dados. Por favor, tente novamente.';
    }

    return msg || 'Ocorreu um erro no servidor.';
}

module.exports = { sanitizeErrorMessage };
