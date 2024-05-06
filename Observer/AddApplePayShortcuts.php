<?php
/**
 *
 * Adyen ExpressCheckout Module
 *
 * Copyright (c) 2020 Adyen B.V.
 * This file is open source and available under the MIT license.
 * See the LICENSE file for more info.
 *
 * Author: Adyen <magento@adyen.com>
 */
namespace Adyen\ExpressCheckout\Observer;

use Adyen\ExpressCheckout\Block\ApplePay\Shortcut\Button;
use Adyen\ExpressCheckout\Model\Config\Source\ShortcutAreas;
use Adyen\ExpressCheckout\Model\ConfigurationInterface;
use Magento\Catalog\Block\ShortcutButtons;
use Magento\Checkout\Block\QuoteShortcutButtons;
use Magento\Checkout\Model\Session;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\Exception\LocalizedException;

class AddApplePayShortcuts implements ObserverInterface
{
    /**
     * @var ConfigurationInterface
     */
    private $configuration;

    /**
     * @var Session
     */
    private $checkoutSession;

    /**
     * AddApplePayShortcuts constructor
     *
     * @param ConfigurationInterface $configuration
     * @param Session $checkoutSession
     */
    public function __construct(
        ConfigurationInterface $configuration,
        Session $checkoutSession
    ) {
        $this->configuration = $configuration;
        $this->checkoutSession = $checkoutSession;
    }

    /**
     * Add apple pay shortcut button
     *
     * @param Observer $observer
     * @return void
     * @throws LocalizedException
     */
    public function execute(Observer $observer)
    {
        $currentPageIdentifier = $this->getCurrentPageIdentifier($observer);

        //Testing
        $adyenPaymentMethods = $this->checkoutSession->getData('adyenPaymentMethods');

        /*
         * Not in PDP/Cart/Minicart
         * And Not coming from /paymentMethods Response
         */
        if (
            !in_array($currentPageIdentifier, $this->configuration->getShowApplePayOn())
            && isset($adyenPaymentMethods['paymentMethodsResponse'])
            && !in_array('ApplePay', array_column($adyenPaymentMethods['paymentMethodsResponse']['paymentMethods'], 'name'))
        ) {
            return;
        }

        /** @var ShortcutButtons $shortcutButtons */
        $shortcutButtons = $observer->getEvent()->getContainer();
        $shortcut = $shortcutButtons->getLayout()->createBlock(Button::class);
        $shortcut->setIsProductView((bool)$observer->getData('is_catalog_product'));
        $shortcut->setIsCart(get_class($shortcutButtons) === QuoteShortcutButtons::class);
        $shortcutButtons->addShortcut($shortcut);
    }

    /**
     * Return current page identifier to compare with config values
     *
     * @param Observer $observer
     * @return int
     */
    private function getCurrentPageIdentifier(
        Observer $observer
    ): int {
        if ($observer->getData('is_catalog_product')) {
            return ShortcutAreas::PRODUCT_VIEW_VALUE;
        }
        $shortcutsBlock = $observer->getEvent()->getContainer();
        $isMinicart = (bool) $shortcutsBlock->getData('is_minicart');
        if ($isMinicart === true) {
            return ShortcutAreas::MINICART_VALUE;
        }
        return ShortcutAreas::CART_PAGE_VALUE;
    }
}
