const nodemailer = require("nodemailer");

function currencySign(amount) {
  if (amount == null || isNaN(amount)) {
    return '$0';
  }
  return `$${amount}`;
}

// Configure email transporter with App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || process.env.SMTP_HOST,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true,
  logger: true
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

const sendMail = async (to, subject, html) => {
  console.log('Sending email with config:', {
    from: `Merk App <${process.env.SMTP_EMAIL || 'merkapp25@gmail.com'}>`,
    to,
    subject,
    hasHtml: !!html
  });

  try {
    const info = await transporter.sendMail({
      from: `Merk App <${process.env.SMTP_EMAIL || 'merkapp25@gmail.com'}>`,
      to,
      subject,
      html,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  welcomeMail: async (details) => {
    const firstName = details.name.split(' ')[0];
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Merk</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" style="max-width: 900px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(18, 52, 77, 0.1);">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #12344D 0%, #1a4d6f 100%); padding: 0; position: relative;">
                  <div style="padding: 50px 50px 40px; text-align: center; position: relative;">
                    <!-- Decorative circles -->
                    <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background-color: rgba(229, 143, 20, 0.1); border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; background-color: rgba(229, 143, 20, 0.15); border-radius: 50%;"></div>
                    
                    <h1 style="margin: 0; color: #000000; font-size: 42px; font-weight: 700; letter-spacing: -1px; position: relative; z-index: 1;">
                      Welcome to <span style="color: #E58F14;">Merk</span>
                    </h1>
                    <p style="margin: 15px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px; font-weight: 400; position: relative; z-index: 1;">
                      Your premium shopping experience starts here
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 50px 50px;">
                  <!-- Greeting -->
                  <h2 style="margin: 0 0 20px; color: #12344D; font-size: 28px; font-weight: 600;">
                    Hello ${firstName}! 👋
                  </h2>
                  
                  <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.7;">
                    We're absolutely thrilled to have you join the <strong style="color: #E58F14;">Merk</strong> family! Your account has been successfully created and you're all set to explore our exclusive collection.
                  </p>

                  <!-- Account Details Card -->
                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #E58F14; border-radius: 12px; padding: 25px; margin: 30px 0;">
                    <h3 style="margin: 0 0 15px; color: #12344D; font-size: 18px; font-weight: 600;">
                      📧 Your Account Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Email:</td>
                        <td style="padding: 8px 0; color: #12344D; font-size: 14px; font-weight: 600; text-align: right;">${details.email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Account Type:</td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="background-color: #E58F14; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Premium</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">Created:</td>
                        <td style="padding: 8px 0; color: #12344D; font-size: 14px; font-weight: 600; text-align: right;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Features Section -->
                  <div style="margin: 35px 0;">
                    <h3 style="margin: 0 0 25px; color: #12344D; font-size: 20px; font-weight: 600; text-align: center;">
                      🎁 What's waiting for you?
                    </h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 20px; vertical-align: top; width: 33.33%;">
                          <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="text-align: center; padding-bottom: 15px;">
                                <table style="width: 60px; height: 60px; background: linear-gradient(135deg, #E58F14 0%, #f5a623 100%); border-radius: 12px; margin: 0 auto; border-collapse: collapse;">
                                  <tr>
                                    <td style="text-align: center; vertical-align: middle; font-size: 28px; line-height: 1;">
                                      🛍️
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="text-align: center;">
                                <h4 style="margin: 0 0 8px; color: #12344D; font-size: 16px; font-weight: 600;">Exclusive Products</h4>
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">Access to premium products and limited editions</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding: 20px; vertical-align: top; width: 33.33%;">
                          <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="text-align: center; padding-bottom: 15px;">
                                <table style="width: 60px; height: 60px; background: linear-gradient(135deg, #12344D 0%, #1a4d6f 100%); border-radius: 12px; margin: 0 auto; border-collapse: collapse;">
                                  <tr>
                                    <td style="text-align: center; vertical-align: middle; font-size: 28px; line-height: 1;">
                                      🚚
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="text-align: center;">
                                <h4 style="margin: 0 0 8px; color: #12344D; font-size: 16px; font-weight: 600;">Fast Delivery</h4>
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">Lightning-fast shipping to your doorstep</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding: 20px; vertical-align: top; width: 33.33%;">
                          <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="text-align: center; padding-bottom: 15px;">
                                <table style="width: 60px; height: 60px; background: linear-gradient(135deg, #E58F14 0%, #f5a623 100%); border-radius: 12px; margin: 0 auto; border-collapse: collapse;">
                                  <tr>
                                    <td style="text-align: center; vertical-align: middle; font-size: 28px; line-height: 1;">
                                      💎
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="text-align: center;">
                                <h4 style="margin: 0 0 8px; color: #12344D; font-size: 16px; font-weight: 600;">Premium Support</h4>
                                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">24/7 dedicated customer service team</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0 20px;">
                    <a href="${process.env.FRONTEND_URL || 'https://www.merkapp.net'}" 
                       style="display: inline-block; background: linear-gradient(135deg, #E58F14 0%, #f5a623 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(229, 143, 20, 0.3); transition: all 0.3s ease;">
                      🛒 Start Shopping Now
                    </a>
                  </div>

                  <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                    Have questions? Our support team is here to help!<br>
                    Reply to this email or visit our help center.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="text-align: center; padding-bottom: 15px;">
                        <a href="#" style="display: inline-block; margin: 0 10px; width: 36px; height: 36px; background-color: #12344D; border-radius: 50%; text-decoration: none; color: #ffffff; line-height: 36px; font-size: 16px;">f</a>
                        <a href="#" style="display: inline-block; margin: 0 10px; width: 36px; height: 36px; background-color: #12344D; border-radius: 50%; text-decoration: none; color: #ffffff; line-height: 36px; font-size: 16px;">𝕏</a>
                        <a href="#" style="display: inline-block; margin: 0 10px; width: 36px; height: 36px; background-color: #12344D; border-radius: 50%; text-decoration: none; color: #ffffff; line-height: 36px; font-size: 16px;">in</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
                        <p style="margin: 0 0 8px;">
                          <strong style="color: #12344D;">Merk</strong> - Your Premium Shopping Destination
                        </p>
                        <p style="margin: 0 0 8px;">
                          Unidad 22009Centro Morazan, Blvd Morazan, Tegucigalpa MDC Honduras, 11101
                        </p>
                        
                      </td>
                    </tr>
                    <tr>
                      <td style="text-align: center; padding-top: 20px;">
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
                          <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                            &copy; ${new Date().getFullYear()} Merk. All rights reserved.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    await sendMail(details.email, `Welcome to Merk, ${firstName}! 🎉`, html);
  },

  sendOTPmail: async ({ email, code }) => {
    console.log(email, code);
    try {
      const html = `<div> \r\n<p>Hello,<\/p>\r\n\r\n<p> Welcome to <strong>Resaz</strong>. <\/p>\r\n\r\n<p>Your One-Time password  code is: <strong>${code}</strong>. This passcode will expire in 5 minutes<\/p>\r\n<\/br>Thanks,<\/p>\r\n\r\n<p><b>The Resaz Account Team<\/b><\/p><\/div>`;
      return await sendMail(email, "Password Reset Instructions", html);
    } catch (err) {
      console.log(err);
      throw new Error("Could not send OTP mail");
    }
  },

  passwordChange: async ({ email }) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #333;">Password Reset Notification</h2>
          <p>Hello ${email},</p>
          <p>This is to inform you that your password has been reset.</p>
  
          <p>If you didn't make this change or believe it was unauthorized, please contact support immediately.</p>
  
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} Resaz. All rights reserved.</p>
        </div>
      `;
      return await sendMail(email, "PASSWORD RESET NOTIFICATION EMAIL", html);
    } catch (err) {
      throw new Error("Could not send OTP mail");
    }
  },

  updateMail: async ({ email, confirmUrl }) => {
    try {
      const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">Admin Profile Update Request</h2>
      <p>Hello Admin,</p>
      <p>We received a request to update your profile details. To apply the changes, please confirm by clicking the button below:</p>
      
      <a href="${confirmUrl}" 
         style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Confirm Update
      </a>

      <p>If you didn't request this change, you can ignore this email. The changes will not be applied unless you confirm.</p>

      <p style="color: #888; font-size: 12px;">This link will expire in 15 minutes.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
      <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} Resaz. All rights reserved.</p>
    </div>`;
      return await sendMail(email, "Confirm Your Admin Profile Update", html);
    } catch (err) {
      throw new Error("Could not send OTP mail");
    }
  },

  updateUser: async ({ email, name }) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #333;">Profile Update Notification</h2>
          <p>Hello ${name},</p>
          <p>This is to inform you that your profile details have been updated successfully.</p>
  
          <p>If you didn't make this change or believe it was unauthorized, please contact support immediately.</p>
  
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} Resaz. All rights reserved.</p>
        </div>
      `;

      return await sendMail(email, "Your Profile Was Updated", html);
    } catch (err) {
      throw new Error("Could not send update notification email");
    }
  },

  returnMail: async ({ email, returnAmount }) => {
    try {
      const html = `A refund has been processed for one of your orders. Amount: ${currencySign(returnAmount)}`;
      return await sendMail(email, "Order Returned", html);
    } catch (err) {
      console.error("Mail error:", err);
      throw new Error("Could not send mail");
    }
  },

  returnReminderMail: async ({ email, orderId }) => {
    console.log("Sending return reminder mail to:", email);
    console.log("Order ID:", orderId);
    try {
      const html = `<div> \r\n<p>Hello,<\/p>\r\n\r\n<p> This is a reminder that your order with ID: <strong>${orderId}</strong> is not returned yet. Please initiate the return process if you wish to do so.<\/p>\r\n<\/br>Thanks,<\/p>\r\n\r\n<p><b>The Resaz Account Team<\/b><\/p><\/div>`;
      return await sendMail(email, "Return Reminder", html);
    } catch (err) {
      console.error("Mail error:", err);
      throw new Error("Could not send mail");
    }
  },

  sendNotification: async (userIds, title, description) => {
    try {
      const html = `<div> \r\n<p>Hello,<\/p>\r\n\r\n<p> ${description} <\/p>\r\n<\/br>Thanks,<\/p>\r\n\r\n<p><b>The Resaz Account Team<\/b><\/p><\/div>`;
      for (const userId of userIds) {
        await sendMail(userId, title, html);
      }
    } catch (err) {
      console.error("Mail error:", err);
      throw new Error("Could not send notification mail");
    }
  },
};