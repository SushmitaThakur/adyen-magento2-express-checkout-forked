<?php
declare(strict_types=1);

namespace Adyen\ExpressCheckout\Model;

use Adyen\AdyenException;
use Adyen\ExpressCheckout\Api\ExpressPayPalPaymentsInterface;
use Adyen\Payment\Helper\Data;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Quote\Model\QuoteFactory;
use Magento\Quote\Model\ResourceModel\Quote as QuoteResource;
use Magento\Reports\Model\ResourceModel\Quote\CollectionFactoryInterface;

class ExpressPayPalPayments implements ExpressPayPalPaymentsInterface
{
    public function __construct(
        Data $adyenDataHelper,
        QuoteFactory $quoteFactory,
        QuoteResource $quoteResource
    ) {
        $this->adyenDataHelper = $adyenDataHelper;
        $this->quoteFactory = $quoteFactory;
        $this->quoteResource = $quoteResource;
    }

    /**
     * @param string $payload
     * @return mixed
     * @throws \Magento\Framework\Exception\AlreadyExistsException
     * @throws AdyenException
     */
    public function execute($payload)
    {
        // create an empty quote to retrieve the merchantReference
        $quote = $this->quoteFactory->create();
        $this->quoteResource->save($quote);
        $quoteId = $quote->getId();

        // set merchantReference to payload
        $payloadData = json_decode($payload, true);
        $payloadData['reference'] = $quoteId;


        try {
            $client = $this->adyenDataHelper->initializeAdyenClient();
            $checkoutService = $this->adyenDataHelper->createAdyenCheckoutService($client);
            $result = $checkoutService->payments($payloadData);
            return [
                "response" => $result
            ];
        } catch (AdyenException|NoSuchEntityException $e) {
            print($e);
        }

    }
}
