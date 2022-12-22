define([
    'mage/storage',
    'Adyen_ExpressCheckout/js/helpers/getExpressApi'
], function (storage, getExpressApi) {
    'use strict';

    return function (payload, isProductView) {
        return storage.post(
            getExpressApi('paypal-init', isProductView),
            payload
        );
    };
});
