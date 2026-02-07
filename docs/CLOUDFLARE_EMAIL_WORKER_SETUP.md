# CloudFlare Email Worker Setup

1. Create free account at [CloudFlare](https://cloudflare.com/).
2. Add your own domain to CloudFlare [Tutorial](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/).
3. Open your own domain dashboard at CloudFlare and go to "Email" -> "Email Routing" on the left sidebar.
4. Enable Email Routing by adding missing MX and TXT records. They will be added automatically after you click "Enable Email Routing" -> "Add records and enable"
5. Create Email Worker which will forward received emails to your self-hosted TempFastMail instance [Tutorial](https://github.com/kasteckis/cloudflare-email-worker-html-parser)
6. In "Routing rules" tab add new rule to forward emails to your worker. Enable "Catch-All".
7. That's it :)
