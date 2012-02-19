<?php

class JsonResponseBuilder
{
    /**
     * Returns the JSON representation of a value
     *
     * @param mixed $value The value being encoded. Can be any type except a resource.
     * @return string The JSON encoded value on success
     */
    public static function response($value)
    {
        return json_encode($value);
    }

    /**
     * Gets the success response
     * @param mixed $value The value being encoded. Can be any type except a resource.
     *
     * @return string The success json string.
     */
    public static function success($value = false)
    {
        if ($value) {
            $value['success'] = true;
        } else {
            $value = array('success' => true);
        }

        return json_encode($value);
    }

    /**
     * Gets the failure response
     * @param mixed $value The value being encoded. Can be any type except a resource.
     *
     * @return string The failure json string.
     */
    public static function failure($value = false)
    {
        if ($value) {
            $value['success'] = false;
        } else {
            $value = array('success' => false);
        }

        return json_encode($value);
    }
}

?>
