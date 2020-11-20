using { Currency, User, managed, cuid } from '@sap/cds/common';
using from '@capire/common';
namespace sap.capire.orders;

entity Orders : cuid, managed {
  OrderNo  : String @title:'Order Number'; //> readable key
  Items    : Composition of many {
    key ID    : UUID;
    @assert.integrity:false // REVISIT: this is a temporary workaround for a glitch in cds-runtime
    product   : Association to Products;
    amount    : Integer;
    title     : String;
    price     : Double;
  };
  buyer    : User;
  currency : Currency;
}

/** This is a stand-in for arbitrary ordered Products */
@cds.persistence.skip:'always'
entity Products {
  key ID : String;
}