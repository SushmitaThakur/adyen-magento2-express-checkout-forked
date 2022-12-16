<?php
declare(strict_types=1);

namespace Adyen\ExpressCheckout\Model;

use Adyen\ExpressCheckout\Api\ExpressPayPalInitInterface;
use Adyen\Payment\Helper\Data;
use phpDocumentor\Reflection\Types\Object_;

class ExpressPayPalInit implements ExpressPayPalInitInterface
{
    public function __construct(
        Data $adyenDataHelper
    ) {
        $this->adyenDataHelper = $adyenDataHelper;
    }
    /**
     * @return void
     * @api
     */
    public function execute($payload): void
    {
//        $payload = array(
//            "amount" => [
//                "currency" => "USD",
//                "value" => 1000
//            ],
//            "reference" => "1001",
//            "paymentMethod" => [
//                "type" => "paypal",
//                "subtype" => "sdk"
//            ],
//            "returnUrl" => "https://www.adyen.com",
//            "merchantAccount" => "RokLedinski"
//        );

        $pleaseWork = $payload;

//        $objPayload = json_encode($payload);


        $client = $this->adyenDataHelper->initializeAdyenClient();
        $checkoutService = $this->adyenDataHelper->createAdyenCheckoutService($client);
        $checkoutService->payments($payload);
    }
}
