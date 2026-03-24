import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all payments for an order
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', req.params.orderId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment (admin and audit_manager only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { order_id, amount, payment_date, method, reference, notes } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ message: 'Order ID and amount are required' });
    }

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, paid_amount')
      .eq('id', order_id)
      .single();

    if (orderError) throw orderError;

    // Validate payment amount
    const newPaidAmount = parseFloat(order.paid_amount) + parseFloat(amount);
    if (newPaidAmount > parseFloat(order.total_amount)) {
      return res.status(400).json({
        message: 'Payment amount exceeds order balance'
      });
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        order_id,
        amount,
        payment_date: payment_date || new Date().toISOString(),
        method,
        reference,
        notes,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update order paid amount and status
    const updatedPaidAmount = newPaidAmount;
    let newStatus = 'partial';

    if (updatedPaidAmount >= parseFloat(order.total_amount)) {
      newStatus = 'paid';
    } else if (updatedPaidAmount === 0) {
      newStatus = 'pending';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: updatedPaidAmount,
        status: newStatus
      })
      .eq('id', order_id);

    if (updateError) throw updateError;

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment (admin and audit_manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_date, method, reference, notes } = req.body;

    // Get current payment
    const { data: currentPayment, error: currentError } = await supabase
      .from('payments')
      .select('order_id, amount')
      .eq('id', req.params.id)
      .single();

    if (currentError) throw currentError;

    // Update payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ amount, payment_date, method, reference, notes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Recalculate order paid amount
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', currentPayment.order_id);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Get order total
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('id', currentPayment.order_id)
      .single();

    if (orderError) throw orderError;

    // Update order status
    let newStatus = 'partial';
    if (totalPaid >= parseFloat(order.total_amount)) {
      newStatus = 'paid';
    } else if (totalPaid === 0) {
      newStatus = 'pending';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: totalPaid,
        status: newStatus
      })
      .eq('id', currentPayment.order_id);

    if (updateError) throw updateError;

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payment (admin and audit_manager only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get payment details before deletion
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('order_id, amount')
      .eq('id', req.params.id)
      .single();

    if (paymentError) throw paymentError;

    // Delete payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    // Recalculate order paid amount
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', payment.order_id);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Get order total
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('id', payment.order_id)
      .single();

    if (orderError) throw orderError;

    // Update order status
    let newStatus = 'partial';
    if (totalPaid >= parseFloat(order.total_amount)) {
      newStatus = 'paid';
    } else if (totalPaid === 0) {
      newStatus = 'pending';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid_amount: totalPaid,
        status: newStatus
      })
      .eq('id', payment.order_id);

    if (updateError) throw updateError;

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
