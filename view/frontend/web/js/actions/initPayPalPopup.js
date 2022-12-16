define([
    'mage/storage',
    'Adyen_ExpressCheckout/js/helpers/getInternalApiUrl'
], function (storage, getInternalApiUrl) {
    'use strict';

    return function (payload, isProductView) {
        return storage.post(
            getInternalApiUrl('paypal-init', isProductView),
            payload
        );
    };
});
