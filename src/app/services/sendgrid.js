const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const sendMailWithSubjectViaSendgrid = async (to, subject, html) => {
    console.log(to, subject, html)
    const msg = {
        // to,
        from: {
            name: 'Bach Hoa Houston',
            email: process.env.FROM_EMAIL
        }, // Use the email address or domain you verified above
        subject,
        // text: html,
        html,
        personalizations: to.map((email) => ({
            to: email,
        })),

    };
    try {
        await sgMail.send(msg);
    } catch (error) {
        console.error(error);

        if (error.response) {
            console.error(error.response.body)
        }
    }
}

const sendMailWithSTemplateViaSendgrid = async (to, templateId, data = { Name: 'Bach Hoa Houston' }) => {
    console.log(templateId)
    const msg = {
        personalizations: to.map((email) => ({
            to: email,
        })),
        from: {
            name: 'Bach Hoa Houston',
            email: process.env.FROM_EMAIL
        }, // Use the email address or domain you verified above // Use the email address or domain you verified above
        templateId,
        // dynamicTemplateData: data
    };
    console.log(msg)
    try {
        await sgMail.send(msg);
    } catch (error) {
        console.error(error);

        if (error.response) {
            console.error(error.response.body)
        }
    }
}

module.exports = { sendMailWithSubjectViaSendgrid, sendMailWithSTemplateViaSendgrid }