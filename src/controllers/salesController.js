
const isValidUuid = (value) => {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return typeof value === "string" && uuidRegex.test(value);
};

const isValidAmount = (value) => {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );
};

// CREATE SALE
const createSale = async (req, res) => {
    try {
        const {
            shop_id,
            invoice_number,
            items,
            customer_id = null,
            discount = 0,
            tax_amount = 0,
            amount_paid = 0,
            payment_method = null,
            notes = null
        } = req.body;

        if (!isValidUuid(shop_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid shop ID is required"
            });
        }

        if (
            typeof invoice_number !== "string" ||
            !invoice_number.trim() ||
            invoice_number.trim().length > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid invoice number is required (maximum 50 characters)"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one sale item is required"
            });
        }

        const seenProductIds = new Set();

        for (const item of items) {
            if (
                !item ||
                !isValidUuid(item.product_id) ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have a valid product ID and positive integer quantity"
                });
            }

            if (seenProductIds.has(item.product_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate products are not allowed in one sale"
                });
            }

            seenProductIds.add(item.product_id);
        }

        if (
            customer_id !== null &&
            !isValidUuid(customer_id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        if (
            !isValidAmount(discount) ||
            !isValidAmount(tax_amount) ||
            !isValidAmount(amount_paid)
        ) {
            return res.status(400).json({
                success: false,
                message: "Discount, tax and amount paid must be non-negative numbers"
            });
        }

        if (
            payment_method !== null &&
            (
                typeof payment_method !== "string" ||
                !payment_method.trim() ||
                payment_method.trim().length > 30
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be a valid string of up to 30 characters"
            });
        }

        if (notes !== null && typeof notes !== "string") {
            return res.status(400).json({
                success: false,
                message: "Notes must be a string or null"
            });
        }

        const { data, error } = await req.supabase.rpc(
            "create_sale_atomic",
            {
                p_shop_id: shop_id,
                p_invoice_number: invoice_number.trim(),
                p_items: items,
                p_customer_id: customer_id,
                p_discount: discount,
                p_tax_amount: tax_amount,
                p_amount_paid: amount_paid,
                p_payment_method: payment_method?.trim() || null,
                p_notes: notes?.trim() || null
            }
        );

        if (error) {
            console.error("Create sale error:", error.message);

            const statusCode =
                error.code === "23505" ? 409 :
                error.code === "42501" ? 403 :
                400;

            return res.status(statusCode).json({
                success: false,
                message: "Could not create sale",
                error: error.message
            });
        }

        return res.status(201).json(data);

    } catch (error) {
        console.error("Create sale error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// GET SALES HISTORY
const getSales = async (req, res) => {
    try {
        const { shop_id } = req.query;

        if (!isValidUuid(shop_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid shop ID is required"
            });
        }

        const { data, error } = await req.supabase
            .from("sales")
            .select("*")
            .eq("shop_id", shop_id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Get sales error:", error.message);

            return res.status(400).json({
                success: false,
                message: "Could not retrieve sales"
            });
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            sales: data
        });

    } catch (error) {
        console.error("Get sales error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createSale,
    getSales
};
