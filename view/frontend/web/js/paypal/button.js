define([
    'uiComponent',
    'mage/translate',
    'Magento_Customer/js/customer-data',
    'Adyen_Payment/js/adyen',
    'Adyen_ExpressCheckout/js/actions/activateCart',
    'Adyen_ExpressCheckout/js/actions/cancelCart',
    'Adyen_ExpressCheckout/js/actions/createPayment',
    'Adyen_ExpressCheckout/js/actions/getShippingMethods',
    'Adyen_ExpressCheckout/js/actions/getExpressMethods',
    'Adyen_ExpressCheckout/js/actions/setShippingInformation',
    'Adyen_ExpressCheckout/js/actions/setTotalsInfo',
    'Adyen_ExpressCheckout/js/helpers/formatAmount',
    'Adyen_ExpressCheckout/js/helpers/formatCurrency',
    'Adyen_ExpressCheckout/js/helpers/getCartSubtotal',
    'Adyen_ExpressCheckout/js/helpers/getExtensionAttributes',
    'Adyen_ExpressCheckout/js/helpers/getGooglePayStyles',
    'Adyen_ExpressCheckout/js/helpers/getPaymentMethod',
    'Adyen_ExpressCheckout/js/helpers/getPdpForm',
    'Adyen_ExpressCheckout/js/helpers/getPdpPriceBox',
    'Adyen_ExpressCheckout/js/helpers/getRegionId',
    'Adyen_ExpressCheckout/js/helpers/isConfigSet',
    'Adyen_ExpressCheckout/js/helpers/redirectToSuccess',
    'Adyen_ExpressCheckout/js/helpers/setExpressMethods',
    'Adyen_ExpressCheckout/js/helpers/validatePdpForm',
    'Adyen_ExpressCheckout/js/model/config',
    'Adyen_ExpressCheckout/js/model/countries',
    'Adyen_ExpressCheckout/js/model/totals'
],
    function(
        Component,
        $t,
        customerData,
        AdyenCheckout,
        activateCart,
        cancelCart,
        createPayment,
        getShippingMethods,
        getExpressMethods,
        setShippingInformation,
        setTotalsInfo,
        formatAmount,
        formatCurrency,
        getCartSubtotal,
        getExtensionAttributes,
        getGooglePayStyles,
        getPaymentMethod,
        getPdpForm,
        getPdpPriceBox,
        getRegionId,
        isConfigSet,
        redirectToSuccess,
        setExpressMethods,
        validatePdpForm,
        configModel,
        countriesModel,
        totalsModel
    ) {
        'use strict';

        return Component.extend({
            defaults: {
               shippingMethods: {},
               isProductView: false,
               maskedId: null,
               payPalComponent: null
            },

            initialize: async function (config, element) {
                this._super();

                configModel().setConfig(config);
                countriesModel();

                this.isProductView = config.isProductView;

                // Set express methods if not set
                if (this.isProductView) {
                    this.initializeOnPDP(config, element);
                } else {
                    // TODO!! -> check if paypal_ecs or paypal
                    let paypalPaymentMethod = await getPaymentMethod('paypal_ecs', this.isProductView);

                    if (!paypalPaymentMethod) {
                        const cart = customerData.get('cart');
                        cart.subscribe(function () {
                            this.reloadPayPalButton(element);
                        }.bind(this));
                    } else {
                        if(!isConfigSet(paypalPaymentMethod, [/* TODO!! */])) {
                            console.log('Required configuration for PayPal is missing');
                            return;
                        }

                        this.initialisePayPalComponent(paypalPaymentMethod, element);
                    }
                }
            },

            initializeOnPDP: async function (config, element) {
                const res = await getExpressMethods().getRequest(element);
                const cart = customerData.get('cart');

                cart.subscribe(function () {
                    this.reloadPayPalButton(element);
                }.bind(this));

                setExpressMethods(res);
                totalsModel().setTotal(res.totals.grand_total);

                const $priceBox = getPdpPriceBox();
                const pdpForm = getPdpForm(element);

                $priceBox.on('priceUpdated', async function () {
                    const isValid = new Promise((resolve, reject) => {
                        return validatePdpForm(resolve, reject, pdpForm, true);
                    });

                    isValid
                        .then(function () {
                            this.reloadPayPalButton(element);
                        }.bind(this))
                        .catch(function (e) {
                            console.log(e);
                        })
                }.bind(this));

                let paypalPaymentMethod = await getPaymentMethod('paypal', this.isProductView);

                if(!isConfigSet(paypalPaymentMethod, [/* TODO -> which values do I need here?*/])) {
                    return;
                }

                this.initialisePayPalComponent(paypalPaymentMethod, element);
            },

            initialisePayPalComponent: async function (paypalPaymentMethod, element) {
                const config = configModel().getConfig();
                const adyenCheckoutComponent = await new AdyenCheckout({
                    locale: config.locale,
                    originKey: config.originKey,
                    environment: config.checkoutenv,
                    risk: {
                        enabled: false
                    }
                    // TODO!! -> figure out whether clientKey is needed for PP
                });
                // TODO!! -> create method for getting the PP config
                // const paypalConfiguration = this.getPayPalConfiguration(paypalPaymentMethod, element);

                this.payPalComponent
                    .isAvailable()
                    .then(() => {
                        this.payPalComponent.mount(element);
                    }).catch(e => {
                        console.log('PayPal is unavailable', e)
                })

            },

            reloadPayPalButton: async function (element) {
                const paypalPaymentMethod = await getPaymentMethod('paypal_ecs', this.isProductView);

                if (this.isProductView) {
                    const res = await getExpressMethods().getRequest(element);

                    setExpressMethods(res);
                    totalsModel().setTotal(res.totals.grand_total);
                }

                this.unmountPayPal();

                if (!isConfigSet(paypalPaymentMethod, [/* TODO!! -> figure out the required config values */])) {
                    return;
                }

                this.initialisePayPalComponent;
            },

            unmountPayPal: function () {
                if (this.payPalComponent) {
                    this.payPalComponent.unmount();
                }
            }
        });
    }
);
