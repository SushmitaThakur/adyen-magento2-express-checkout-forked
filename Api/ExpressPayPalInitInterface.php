<?php
declare(strict_types=1);

namespace Adyen\ExpressCheckout\Api;

interface ExpressPayPalInitInterface
{
    /**
     * Interface for calling /payments in Adyen
     *
     * @param string $payload
     * @return mixed
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function execute($payload);
}
