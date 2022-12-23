<?php
declare(strict_types=1);

namespace Adyen\ExpressCheckout\Api;

interface ExpressPayPalPaymentDetailsInterface
{
    /**
     * Interface for calling /payment/details in Adyen
     *
     * @param string $payload
     * @return mixed
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function execute($payload);
}
