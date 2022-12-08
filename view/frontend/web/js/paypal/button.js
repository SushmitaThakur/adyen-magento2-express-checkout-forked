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
                    debugger;
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
                    originKey: config.originKey,
                    environment: config.checkoutenv,
                    risk: {
                        enabled: false
                    },
                    clientKey: config.clientKey
                });
                const payPalConfiguration = this.getPayPalConfig(paypalPaymentMethod, element);

                this.payPalComponent = adyenCheckoutComponent.create('paypal', payPalConfiguration);

                this.payPalComponent
                    .isAvailable()
                    .then(() => {
                        this.payPalComponent.mount(element);
                    }).catch(e => {
                        console.log('PayPal is unavailable', e)
                })
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
                const countryCode = config.countryCode();

                return {
                    // amount: {
                    //     value: this.isProductView
                    //         ? formatAmount(totalsModel().getTotal() * 100)
                    //         : formatAmount(getCartSubtotal() * 100),
                    //     currency: config.currency
                    // },
                    // countryCode: countryCode,
                    // onInit: this.onInit.bind(this),
                    // onShippingChange: this.onShippingChange.bind(this),
                    // onClick: (resolve, reject) => {
                    //     validatePdpForm(resolve, reject, pdpForm);
                    //     },
                    // onSubmit: this.handleAction.bind(this),
                    // onError: () => cancelCart(this.isProductView),
                    // ...payPalStyles

                    amount: {
                        value: this.isProductView
                            ? formatAmount(totalsModel().getTotal() * 100)
                            : formatAmount(getCartSubtotal() * 100),
                        currency: config.currency
                    },
                    showPayButton: true,
                    countryCode: countryCode,
                    onClick: () => {console.log('rok was here')},
                    ...payPalStyles
                }
            },

            // onShippingChange: function(data, actions) {
            //     console.log("paypal data object:", data);
            //
            //     // // Reject non-GB addresses
            //     // if (data.shipping_address.country_code !== 'GB') {
            //     //     return actions.reject();
            //     // };
            //     //
            //     // if (data.shipping_address.country_code == 'GB') {
            //     //     console.log("Data:", data)
            //     //     return actions.order.patch([
            //     //         {
            //     //             op: 'replace',
            //     //             path: '/purchase_units/@reference_id==\'default\'/amount',
            //     //             value: {
            //     //                 currency_code: 'USD',
            //     //                 value: '12.00',
            //     //                 breakdown: {
            //     //                     item_total: {
            //     //                         currency_code: 'USD',
            //     //                         value: '10.00'
            //     //                     },
            //     //                     shipping: {
            //     //                         currency_code: 'USD',
            //     //                         value: '1.00'
            //     //                     },
            //     //                     tax_total: {
            //     //                         currency_code: 'USD',
            //     //                         value: '1.00'
            //     //                     }
            //     //                 }
            //     //             }
            //     //         }
            //     //     ]);
            //     // }
            // },

            // onInit: function (data, actions) {
            //     actions.enable(data);
            // },

            // handleAction: function(action, orderId) {
            //     console.log('handle action', action);
            //     // var self = this;
            //     // let popupModal;
            //     //
            //     // fullScreenLoader.stopLoader();
            //     //
            //     // if (action.type === 'threeDS2' || action.type === 'await') {
            //     //     popupModal = self.showModal();
            //     // }
            //     //
            //     // try {
            //     //     self.checkoutComponent.createFromAction(
            //     //         action).mount('#' + this.modalLabel);
            //     // } catch (e) {
            //     //     console.log(e);
            //     //     self.closeModal(popupModal);
            //     // }
            // }
        });
    }
);
