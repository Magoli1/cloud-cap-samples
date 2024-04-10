const cds = require('@sap/cds');
const { error } = require('node:console');
const { Books } = cds.entities('sap.capire.bookshop')
const { setTimeout } = require('node:timers/promises');

async function run() {
  console.log('before tx');
  const tx = cds.tx();
  console.log('after tx');
  try {
    console.log('before run');
    const books = await tx.run(SELECT.from(Books));
    if (books && books.length > 0) console.log('books:', books.length);
    console.log('after run');
    await tx.commit();
    console.log('after commit');
  } catch (error) {
    if(error.message.includes('invalid table name')) {
      await tx.commit();
      console.log('after error commit');
      return;
    }
    await tx.rollback();
    console.error(error);
  }
}

async function startRunDelayed() {
  try {
    await run();
  } catch (error) {
    console.error(error);
  }
  await setTimeout(1000, 'run');
  startRunDelayed();
}
startRunDelayed()

module.exports = class CatalogService extends cds.ApplicationService {
  init() {

    const { Books } = cds.entities('sap.capire.bookshop')
    const { ListOfBooks } = this.entities

    // Add some discount for overstocked books
    this.after('each', ListOfBooks, book => {
      if (book.stock > 111) book.title += ` -- 11% discount!`
    })

    // Reduce stock of ordered books if available stock suffices
    this.on('submitOrder', async req => {
      let { book: id, quantity } = req.data
      let book = await SELECT.from(Books, id, b => b.stock)

      // Validate input data
      if (!book) return req.error(404, `Book #${id} doesn't exist`)
      if (quantity < 1) return req.error(400, `quantity has to be 1 or more`)
      if (quantity > book.stock) return req.error(409, `${quantity} exceeds stock for book #${id}`)

      // Reduce stock in database and return updated stock value
      await UPDATE(Books, id).with({ stock: book.stock -= quantity })
      return book
    })

    // Emit event when an order has been submitted
    this.after('submitOrder', async (_, req) => {
      let { book, quantity } = req.data
      await this.emit('OrderedBook', { book, quantity, buyer: req.user.id })
    })

    // Delegate requests to the underlying generic service
    return super.init()
  }
}
