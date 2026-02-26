const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");
const response = require("./../responses");
const ProductRequest = mongoose.model("ProductRequest");
const Product = mongoose.model("Product");
const User = mongoose.model("User");
const mailNotification = require("../services/mailNotification");
const { notify } = require("../services/notification");


const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const PHONEPE_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const PHONEPE_STATUS_URL = "https://api.phonepe.com/apis/hermes/pg/v1/status";


function generateXVerify(payload, endpoint = "/pg/v1/pay") {
  const string = payload + endpoint + PHONEPE_SALT_KEY;
  const sha256Hash = crypto.createHash("sha256").update(string).digest("hex");
  return sha256Hash + "###" + PHONEPE_SALT_INDEX;
}

module.exports = {
  
  initiatePhonePePayment: async (req, res) => {
    try {
      const { orderID, amount, userPhone, userName, userEmail } = req.body;

      console.log("PhonePe Initiate Request:", { orderID, amount, userPhone, userName, userEmail });

      if (!orderID || !amount) {
        return response.error(res, {
          message: "Order ID and amount are required",
        });
      }

      if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY || !PHONEPE_SALT_INDEX) {
        console.error("PhonePe credentials missing in environment variables");
        return response.error(res, {
          message: "PhonePe configuration error. Please contact support.",
        });
      }

    
      const order = await ProductRequest.findOne({ orderId: orderID });
      if (!order) {
        console.error("Order not found:", orderID);
        return response.error(res, { message: "Order not found" });
      }

      if (order.paymentStatus === "Succeeded") {
        return response.error(res, {
          message: "Payment already completed for this order",
        });
      }

  
      const merchantTransactionId = `${orderID}_${Date.now()}`;

     
      const amountInPaise = Math.round(parseFloat(amount) * 100);

      console.log("PhonePe Payment Details:", {
        merchantId: PHONEPE_MERCHANT_ID,
        merchantTransactionId,
        amount: amountInPaise,
        userPhone: userPhone || order.Local_address?.phoneNumber || "",
      });

    
      const paymentPayload = {
        merchantId: PHONEPE_MERCHANT_ID,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: order.user?.toString() || "GUEST_USER",
        amount: amountInPaise,
        redirectUrl: `${process.env.APP_BASE_URL}Cart?phonepe_callback=true&orderId=${orderID}&merchantTransactionId=${merchantTransactionId}`,
        redirectMode: "REDIRECT",
        callbackUrl: `${process.env.APP_BASE_URL}api/v1/phonepe-callback`,
        mobileNumber: userPhone || order.Local_address?.phoneNumber || "",
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      console.log("PhonePe Payload:", JSON.stringify(paymentPayload, null, 2));

     
      const base64Payload = Buffer.from(
        JSON.stringify(paymentPayload)
      ).toString("base64");

    
      const xVerify = generateXVerify(base64Payload);

      console.log("PhonePe Request:", {
        url: PHONEPE_API_URL,
        base64Length: base64Payload.length,
        xVerify: xVerify.substring(0, 20) + "...",
      });

    
      const phonePeResponse = await axios.post(
        PHONEPE_API_URL,
        {
          request: base64Payload,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
          },
        }
      );

      console.log("PhonePe Response:", JSON.stringify(phonePeResponse.data, null, 2));

   
      order.phonepeTransactionId = merchantTransactionId;
      order.paymentGateway = "PhonePe";
      await order.save();

      
      if (
        phonePeResponse.data.success &&
        phonePeResponse.data.data?.instrumentResponse?.redirectInfo?.url
      ) {
        return response.ok(res, {
          success: true,
          paymentUrl:
            phonePeResponse.data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId: merchantTransactionId,
          message: "PhonePe payment initiated successfully",
        });
      } else {
        console.error("PhonePe Response Error:", phonePeResponse.data);
        return response.error(res, {
          message: "Failed to initiate PhonePe payment",
          details: phonePeResponse.data,
        });
      }
    } catch (error) {
      console.error("PhonePe Initiate Payment Error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      
      return response.error(res, {
        message: "Error initiating PhonePe payment",
        error: error.response?.data?.message || error.message,
        details: error.response?.data,
      });
    }
  },

 
  checkPhonePeStatus: async (req, res) => {
    try {
      const { merchantTransactionId, orderID } = req.body;

      if (!merchantTransactionId || !orderID) {
        return response.error(res, {
          message: "Transaction ID and Order ID are required",
        });
      }

    
      const order = await ProductRequest.findOne({ orderId: orderID });
      if (!order) {
        return response.error(res, { message: "Order not found" });
      }

    
      const statusEndpoint = `${PHONEPE_STATUS_URL}/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
      const xVerifyString = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}${PHONEPE_SALT_KEY}`;
      const xVerify =
        crypto.createHash("sha256").update(xVerifyString).digest("hex") +
        "###" +
        PHONEPE_SALT_INDEX;

    
      const statusResponse = await axios.get(statusEndpoint, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
        },
      });

      const paymentData = statusResponse.data;

    
      if (paymentData.success && paymentData.code === "PAYMENT_SUCCESS") {
      
        if (order.paymentStatus === "Succeeded") {
          return response.ok(res, {
            success: true,
            message: "Payment already processed",
            order: order,
          });
        }

       
        order.paymentStatus = "Succeeded";
        order.phonepePaymentData = paymentData.data;
        order.currency = "INR";

        
        await Promise.all(
          order.productDetail.map(async (productItem) => {
            await Product.findByIdAndUpdate(
              productItem.product,
              {
                $inc: {
                  sold_pieces: productItem.qty,
                  Quantity: -productItem.qty,
                },
              },
              { new: true }
            );
          })
        );

        await order.save();

     
        if (order.user) {
          try {
            const user = await User.findById(order.user);
            if (user) {
              await mailNotification.order({
                email: user.email,
                orderId: order.orderId,
              });

              await notify(
                user,
                "Order Placed",
                `Your order with ID ${order.orderId} has been received.`,
                order.orderId
              );
            }
          } catch (notifError) {
            console.error("Notification error:", notifError.message);
          }
        } else if (order.guestEmail) {
         
          try {
            await mailNotification.order({
              email: order.guestEmail,
              orderId: order.orderId,
            });
          } catch (emailError) {
            console.error("Guest email error:", emailError.message);
          }
        }

        return response.ok(res, {
          success: true,
          message: "Payment successful",
          order: order,
          paymentDetails: paymentData.data,
        });
      } else if (paymentData.code === "PAYMENT_PENDING") {
        return response.ok(res, {
          success: false,
          message: "Payment is pending",
          status: "PENDING",
        });
      } else {
     
        order.paymentStatus = "Failed";
        await order.save();

        return response.error(res, {
          message: "Payment failed",
          status: paymentData.code,
          details: paymentData.data,
        });
      }
    } catch (error) {
      console.error("PhonePe Status Check Error:", error.response?.data || error.message);
      return response.error(res, {
        message: "Error checking payment status",
        error: error.response?.data || error.message,
      });
    }
  },

 
  phonePeCallback: async (req, res) => {
    try {
      const callbackData = req.body;
      console.log("PhonePe Callback Received:", callbackData);

      
      const receivedChecksum = req.headers["x-verify"];
      
     
      if (callbackData.success && callbackData.code === "PAYMENT_SUCCESS") {
        const merchantTransactionId = callbackData.data?.merchantTransactionId;
        
        if (merchantTransactionId) {
          const order = await ProductRequest.findOne({
            phonepeTransactionId: merchantTransactionId,
          });

          if (order && order.paymentStatus !== "Succeeded") {
            order.paymentStatus = "Succeeded";
            order.phonepePaymentData = callbackData.data;
            await order.save();
          }
        }
      }

   
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("PhonePe Callback Error:", error);
      return res.status(200).json({ success: true }); 
    }
  },

  
  cancelPhonePePayment: async (req, res) => {
    try {
      const { orderID } = req.body;

      if (!orderID) {
        return response.error(res, { message: "Order ID is required" });
      }

      const order = await ProductRequest.findOne({ orderId: orderID });
      if (!order) {
        return response.error(res, { message: "Order not found" });
      }

      order.paymentStatus = "Failed";
      await order.save();

      return response.ok(res, {
        success: true,
        message: "Payment cancelled",
      });
    } catch (error) {
      console.error("PhonePe Cancel Error:", error);
      return response.error(res, {
        message: "Error cancelling payment",
        error: error.message,
      });
    }
  },

  // Direct Order Placement without Payment Gateway
  directOrderPlacement: async (req, res) => {
    try {
      const { orderID } = req.body;

      if (!orderID) {
        return response.error(res, { message: "Order ID is required" });
      }

      const order = await ProductRequest.findOne({ orderId: orderID });
      if (!order) {
        return response.error(res, { message: "Order not found" });
      }

      if (order.paymentStatus === "Succeeded") {
        return response.ok(res, {
          success: true,
          message: "Order already processed",
          order: order,
        });
      }

      // Mark order as succeeded without payment
      order.paymentStatus = "Succeeded";
      order.paymentGateway = "Direct Order (No Payment)";
      order.currency = "INR";

      // Update product quantities
      await Promise.all(
        order.productDetail.map(async (productItem) => {
          await Product.findByIdAndUpdate(
            productItem.product,
            {
              $inc: {
                sold_pieces: productItem.qty,
                Quantity: -productItem.qty,
              },
            },
            { new: true }
          );
        })
      );

      await order.save();

      // Send notifications
      if (order.user) {
        try {
          const user = await User.findById(order.user);
          if (user) {
            await mailNotification.order({
              email: user.email,
              orderId: order.orderId,
            });

            await notify(
              user,
              "Order Placed",
              `Your order with ID ${order.orderId} has been received.`,
              order.orderId
            );
          }
        } catch (notifError) {
          console.error("Notification error:", notifError.message);
        }
      } else if (order.guestEmail) {
        try {
          await mailNotification.order({
            email: order.guestEmail,
            orderId: order.orderId,
          });
        } catch (emailError) {
          console.error("Guest email error:", emailError.message);
        }
      }

      return response.ok(res, {
        success: true,
        message: "Order placed successfully",
        order: order,
      });
    } catch (error) {
      console.error("Direct Order Placement Error:", error);
      return response.error(res, {
        message: "Error placing order",
        error: error.message,
      });
    }
  },
};
