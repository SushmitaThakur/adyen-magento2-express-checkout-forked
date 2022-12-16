<?php
declare(strict_types=1);

namespace Adyen\ExpressCheckout\Api;

interface ExpressPayPalInitInterface
{
    /**
     * Interface for performing an Adyen payments call
     *
     * @param $payload
     * @return void
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     * @api
     */
    public function execute($payload): void;
}
