import { createTransport, Transporter } from "nodemailer";
import { UsesendTransport } from 'usesend-nodemailer';

const getTransport = (): Transporter => {
    const apiKey = process.env.USESEND_API_KEY;
    const apiUrl = process.env.USESEND_URL;

    if (!apiKey || !apiUrl) {
        throw new Error('USESEND_API_KEY and USESEND_URL environment variables are required');
    }

    return createTransport(
        UsesendTransport.makeTransport({
            apiKey,
            apiUrl,
        })
    )
};

export const mailer = getTransport();