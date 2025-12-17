const mongoose = require("mongoose");
const ShippingCost = mongoose.model("Shippingcost");

module.exports = {
  addShippingCost: async (req, res) => {
    try {
      const { localCost, shipmentCost, shipmentCostMessage } = req.body;

      if (
        (localCost != null && (isNaN(localCost) || localCost < 0)) ||
        (shipmentCost != null && (isNaN(shipmentCost) || shipmentCost < 0))
      ) {
        return res.status(400).json({ message: "Invalid cost values" });
      }

      const existingCost = await ShippingCost.findOne();
      if (existingCost) {
        return res.status(400).json({
          message: "Shipping costs already set. Use update instead.",
        });
      }

      const shippingCost = new ShippingCost({
        ShippingCostforLocal: localCost || 0,
        ShipmentCostForShipment: shipmentCost || 0,
        shipmentCostMessage: shipmentCostMessage,
      });

      await shippingCost.save();

      res.status(201).json({
        message: "Shipping costs added successfully",
        shippingCost: {
          localCost: shippingCost.ShippingCostforLocal,
          shipmentCost: shippingCost.ShipmentCostForShipment,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getShippingCost: async (req, res) => {
    try {
      const shippingCosts = await ShippingCost.find();

      if (!shippingCosts || shippingCosts.length === 0) {
        return res.status(404).json({ message: "No shipping costs found" });
      }

      res.json({ shippingCosts });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateShippingCost: async (req, res) => {
    try {
      const { localCost, shipmentCost, shipmentCostMessage } = req.body;

      if (
        (localCost != null && (isNaN(localCost) || localCost < 0)) ||
        (shipmentCost != null && (isNaN(shipmentCost) || shipmentCost < 0))
      ) {
        return res.status(400).json({ message: "Invalid cost values" });
      }

      const shippingCost = await ShippingCost.findOne();

      if (!shippingCost) {
        return res.status(404).json({
          message: "Shipping costs not set yet, use add first.",
        });
      }

      if (localCost != null) {
        shippingCost.ShippingCostforLocal = localCost;
      }

      if (shipmentCost != null) {
        shippingCost.ShipmentCostForShipment = shipmentCost;
      }

      if (shipmentCostMessage != null) {
        shippingCost.shipmentCostMessage = shipmentCostMessage;
      }

      await shippingCost.save();

      res.json({
        message: "Shipping costs updated successfully",
        shippingCost: {
          localCost: shippingCost.ShippingCostforLocal,
          shipmentCost: shippingCost.ShipmentCostForShipment,
          shipmentCostMessage:shippingCost.shipmentCostMessage
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
