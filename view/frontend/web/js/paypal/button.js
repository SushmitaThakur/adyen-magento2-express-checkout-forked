define([
    'uiComponent',
    'jquery',
    'mage/translate',
    'mage/storage',
    'Magento_Customer/js/customer-data',
    'Magento_Checkout/js/model/quote',
    'Adyen_Payment/js/model/adyen-configuration',
    'Adyen_Payment/js/adyen',
    'Adyen_ExpressCheckout/js/actions/activateCart',
    'Adyen_ExpressCheckout/js/actions/cancelCart',
    'Adyen_ExpressCheckout/js/actions/createPayment',
    'Adyen_ExpressCheckout/js/actions/getPayPalPayments',
    'Adyen_ExpressCheckout/js/actions/getPayPalPaymentDetails',
    'Adyen_ExpressCheckout/js/actions/getShippingMethods',
    'Adyen_ExpressCheckout/js/actions/getExpressMethods',
    'Adyen_ExpressCheckout/js/actions/setShippingInformation',
    'Adyen_ExpressCheckout/js/actions/setTotalsInfo',
    'Adyen_ExpressCheckout/js/helpers/formatAmount',
    'Adyen_ExpressCheckout/js/helpers/formatCurrency',
    'Adyen_ExpressCheckout/js/helpers/getCartSubtotal',
    'Adyen_ExpressCheckout/js/helpers/getExtensionAttributes',
    'Adyen_ExpressCheckout/js/helpers/getPayPalStyles',
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
        $,
        $t,
        storage,
        customerData,
        quote,
        AdyenConfiguration,
        AdyenCheckout,
        activateCart,
        cancelCart,
        createPayment,
        getPayPalPayments,
        getPayPalPaymentDetails,
        getShippingMethods,
        getExpressMethods,
        setShippingInformation,
        setTotalsInfo,
        formatAmount,
        formatCurrency,
        getCartSubtotal,
        getExtensionAttributes,
        getPayPalStyles,
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
                    let paypalPaymentMethod = await getPaymentMethod('paypal', this.isProductView);

                    if (!paypalPaymentMethod) {
                        const cart = customerData.get('cart');
                        cart.subscribe(function () {
                            this.reloadPayPalButton(element);
                        }.bind(this));
                    } else {
                        if(!isConfigSet(paypalPaymentMethod)) {
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

                if(!isConfigSet(paypalPaymentMethod)) {
                    return;
                }

                this.initialisePayPalComponent(paypalPaymentMethod, element);
            },

            initialisePayPalComponent: async function (paypalPaymentMethod, element) {
                const config = configModel().getConfig();
                const adyenCheckoutComponent = await new AdyenCheckout({
                    locale: config.locale,
                    originKey: config.originkey,
                    environment: config.checkoutenv,
                    risk: {
                        enabled: false
                    },
                    clientKey: AdyenConfiguration.getClientKey(),
                });
                const payPalConfiguration = this.getPayPalConfig(paypalPaymentMethod, element);

                this.payPalComponent = adyenCheckoutComponent
                    .create(paypalPaymentMethod, payPalConfiguration)
                    .mount(element);
            },

            reloadPayPalButton: async function (element) {
                const paypalPaymentMethod = await getPaymentMethod('paypal', this.isProductView);

                if (this.isProductView) {
                    const res = await getExpressMethods().getRequest(element);

                    setExpressMethods(res);
                    totalsModel().setTotal(res.totals.grand_total);
                }

                this.unmountPayPal();

                if (!isConfigSet(paypalPaymentMethod)) {
                    return;
                }

                this.initialisePayPalComponent;
            },

            unmountPayPal: function () {
                if (this.payPalComponent) {
                    this.payPalComponent.unmount();
                }
            },

            getPayPalConfig: function (paypalPaymentMethod, element) {
                const payPalStyles = getPayPalStyles();
                const config = configModel().getConfig();
                const pdpForm = getPdpForm(element);
                const countryCode = config.countryCode;

                return {
                    // showPayButton: true,
                    amount: {
                        value: this.isProductView
                            ? formatAmount(totalsModel().getTotal() * 100)
                            : formatAmount(getCartSubtotal() * 100),
                        currency: config.currency
                    },
                    // TODO => get all configuration from payment methods
                    configuration: {
                        intent: paypalPaymentMethod.configuration.intent,
                        merchantId: paypalPaymentMethod.configuration.merchantId
                    },
                    countryCode: countryCode,
                    // data: {
                    //     personalDetails: {
                    //         firstName: 'rok',
                    //         lastName: 'popov ledinski',
                    //         telephoneNumber: '0666666666',
                    //         shopperEmail: 'rok@gmail.com',
                    //         gender: 'MALE',
                    //         dateOfBirth: '06-05-1990'
                    //     },
                    //     billingAddress: {
                    //         city: 'Eefde',
                    //         country: 'Netherlands',
                    //         houseNumberOrName: '55',
                    //         postalCode: '1019VM',
                    //         street: 'Street'
                    //     },
                    //     shippingAddress: {
                    //        city: 'Eefde',
                    //        country: 'Netherlands',
                    //        houseNumberOrName: '55',
                    //        postalCode: '1019VM',
                    //        street: 'Street'
                    //     }
                    // },
                    // blockPayPalCreditButton: true,
                    // blockPayPalPayLaterButton: true,
                    // hasHolderName: AdyenConfiguration.getHasHolderName(),
                    // holderNameRequired: AdyenConfiguration.getHasHolderName() &&
                    //     AdyenConfiguration.getHolderNameRequired(),
                    onSubmit: (state, component) => this.populatePayPalPopup(state, component),
                    onShippingChange: (data, actions) => this.handleOnShippingChange(data, actions),
                    onAdditionalDetails: (state, component) => this.handleOnAdditionalDetails(state, component),
                    onError: () => cancelCart(this.isProductView),
                    ...payPalStyles
                }
            },

            populatePayPalPopup: function (state, component) {
                // TODO get merchantReference dynamically
                debugger;
                const config = configModel().getConfig();

                let payload = {
                    amount: {
                        value: this.isProductView
                            ? formatAmount(totalsModel().getTotal() * 100)
                            : formatAmount(getCartSubtotal() * 100),
                        currency: config.currency
                    },
                    reference: '1005',
                    paymentMethod: {
                        type: state.data.paymentMethod.type,
                        subtype: state.data.paymentMethod.subtype
                    },
                    returnUrl: config.actionSuccess,
                    merchantAccount: config.merchantAccount
                }

                getPayPalPayments(JSON.stringify({
                    payload: JSON.stringify(payload),
                    form_key: $.mage.cookies.get('form_key')
                }), this.isProductView)
                    .then((res, data) => {
                    if (data === 'success' && !!res[0].action) {
                        component.handleAction(res[0].action);
                    } else {
                        console.log(data);
                    }
                })
                    .catch(e => {
                        throw Error(e)
                    })
            },
            handleOnShippingChange: function(data, actions) {
                console.log('shipping data changed: ', data);
                console.log('shipping actions: ', actions);
                // TODO -> create a callback that will:
                // - when the user changes the address within the paypal popup
                // - get the first available shipping method from magento
                // - calculate the updated order amount and feed that information to the popup
                // - so the user will see the updated order amount when updating the delivery address

                // return actions.order.patch([
                //     {
                //         op: 'replace',
                //         path: '/purchase_units/@reference_id==\'default\'/amount',
                //         value: {
                //             currency_code: 'USD',
                //             value: '12.00',
                //             breakdown: {
                //                 item_total: {
                //                     currency_code: 'USD',
                //                     value: '10.00'
                //                 },
                //                 shipping: {
                //                     currency_code: 'USD',
                //                     value: '1.00'
                //                 },
                //                 tax_total: {
                //                     currency_code: 'USD',
                //                     value: '1.00'
                //                 }
                //             }
                //         }
                //     }
                // ]);
            },
            handleOnAdditionalDetails: function (state, component) {
                // debugger;

                let req = {};
                if (!!state.data) {
                    req = state.data;
                }
                req.orderId = state.data.details.orderID;

                // TODO
                // - make a call to internal endpoint which will use m2 quote interface -> Magento\Quote\Api\CartRepositoryInterface (model -> Magento/Quote/Model/QuoteRepository.php)
                // - create a quote
                // - retrieve ID, customer information (email, firstname, lastname), shipping methods, shipping address, billing address and send it to the frontend


                getPayPalPaymentDetails(JSON.stringify({
                    payload: JSON.stringify(req),
                    form_key: $.mage.cookies.get('form_key')
                }), this.isProductView)
                    .done((res) => {
                            console.log('quote billing address: ', quote.billingAddress());
                            console.log('quote shipping address: ', quote.shippingAddress());
                            console.log(res);
                        }
                        // $.mage.redirect(
                        //     window.checkoutConfig.payment[quote.paymentMethod().method].successPage
                        // )}
                    )
                    .fail(() => console.log('it doesn\'t work'))
            },
        });
    }
);
