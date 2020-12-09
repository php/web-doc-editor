<?php

class BingTranslatorException extends Exception
{
    public function __construct($string)
    {
        parent::__construct($string, 0);
    }

    public function __toString()
    {
        return __CLASS__ . ": [{$this->code}]: {$this->message}\n";
    }
}

class BingTranslator
{
    protected $apiKey;

    public function __construct($apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function translate($from, $to, $text)
    {
        $parameters = array(
            'api-version' => '3.0',
            'from' => $from,
            'to' => $to,
        );

        $ch = curl_init();
        curl_setopt(
            $ch,
            CURLOPT_URL,
            'https://api.cognitive.microsofttranslator.com/translate?' . http_build_query($parameters)
        );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt(
            $ch,
            CURLOPT_POSTFIELDS,
            json_encode(
                array(
                    array(
                        'Text' => $text
                    )
                )
            )
        );

        $headers = array();
        $headers[] = 'Ocp-Apim-Subscription-Key: ' . $this->apiKey;
        $headers[] = 'Ocp-Apim-Subscription-Region: centralus';
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $result = curl_exec($ch);
        if (curl_errno($ch)) {
            throw new BingTranslatorException(curl_error($ch));
        }
        curl_close($ch);

        $response = json_decode($result, true);
        if (isset($response['error'])) {
            throw new BingTranslatorException($response['error']['message']);
        }

        if ($text = $response[0]['translations'][0]['text']) {
            return $text;
        }

        throw new BingTranslatorException('no translation');
    }
}