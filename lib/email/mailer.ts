import { createTransport, Transporter } from "nodemailer";
import { UsesendTransport } from 'usesend-nodemailer';
    
const getTransport = (): Transporter => {
    const apiKey = process.env.USESEND_API_KEY;

    if (!apiKey) {
        throw new Error('USESEND_API_KEY environment variable is required');
    }

    return createTransport(
        UsesendTransport.makeTransport({
            apiKey,
            apiUrl: process.env.USESEND_URL ?? 'https://send.neuw.app/',
        })
    )
};

export const mailer = getTransport();