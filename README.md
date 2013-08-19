Includes authorize function to create an auth header for one specific user account, as well as a sample usage (getAccount function).

Current issues (which anyone else is free to send a pull request for):

1. Only configurable by modifying constants in the code.
2. Unix dependencies (jQuery/jsdom and `curl`).
3. While not as unreliable as browser automation, this does still carry a dependency on the TradeStation user authentication form, which could hypothetically change at any time.

For more information, see:

* http://tradestation.com/
* http://tradestation.github.io/webapi-docs/
