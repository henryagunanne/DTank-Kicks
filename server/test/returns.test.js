const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/index');
const mongoose = require('mongoose');
const Order = require('../src/models/Order');

describe('Returns API (smoke tests)', function() {
  before(function(done) {
    // connect to test DB if not already
    if (mongoose.connection.readyState === 1) return done();
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dtank-kicks-test', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => done()).catch(done);
  });

  after(function(done) {
    mongoose.connection.close().then(() => done()).catch(done);
  });

  it('creates a return request for an existing order', async function() {
    // create a simple order
    const order = await Order.create({
      items: [{ product: mongoose.Types.ObjectId(), variantId: 'v1', name: 'Test Shoe', quantity: 2, price: 6500 }],
      total: 13000,
    });

    const res = await request(app)
      .post(`/api/returns/orders/${order._id}`)
      .send({ items: [{ orderItemIndex: 0, quantity: 1 }] })
      .set('Accept', 'application/json');

    expect(res.status).to.be.oneOf([200,201]);
    expect(res.body).to.have.property('returnRequest');
    expect(res.body.returnRequest.items[0].quantity).to.equal(1);

    // cleanup
    await Order.findByIdAndDelete(order._id);
  }).timeout(5000);
});
