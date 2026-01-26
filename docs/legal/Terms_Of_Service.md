# Terms of Service

**Last Updated**: December 28, 2025

## 1. Acceptance of Terms

By accessing and using the OSM Notes API ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

## 2. Description of Service

The OSM Notes API provides programmatic access to OpenStreetMap notes analytics data, including:

- User profiles and statistics
- Country analytics
- Notes and comments data
- Advanced search capabilities
- Rankings and comparisons
- Trends analysis

## 3. Acceptable Use

### Permitted Uses

You may use the Service for:

- Legitimate research and analysis purposes
- Building applications that consume OSM notes data
- Educational purposes
- Non-commercial projects

### Prohibited Uses

You agree NOT to use the Service to:

- Violate any applicable laws or regulations
- Infringe upon the rights of others
- Transmit any harmful, offensive, or illegal content
- Attempt to gain unauthorized access to the Service
- Overload, spam, or disrupt the Service
- Use automated tools to scrape data without proper rate limiting
- Reverse engineer or attempt to extract the source code
- Use the Service for any illegal or unauthorized purpose

## 4. Rate Limiting and Fair Use

### Rate Limits

The Service implements rate limiting to ensure fair usage:

- **Anonymous Users**: 50 requests per 15 minutes per IP address and User-Agent combination
- **Authenticated Users**: 1000 requests per hour (when OAuth is available)
- **Bots/Automated Tools**: 10 requests per hour

### Fair Use Policy

- Use reasonable request rates appropriate for your use case
- Implement proper caching to reduce unnecessary requests
- Respect rate limit responses (HTTP 429) and back off appropriately
- Do not attempt to circumvent rate limits

### Violations

Violations of rate limits or fair use policies may result in:

- Temporary blocking of your IP address
- Permanent ban from the Service
- Legal action if applicable

## 5. User-Agent Requirement

All requests MUST include a valid User-Agent header in the following format:

```
AppName/Version (contact@example.com)
```

**Requirements**:
- AppName: Name of your application
- Version: Version number of your application
- Contact email: Valid email address for contact

**Example**:
```
User-Agent: MyOSMApp/1.0 (developer@example.com)
```

Requests without a valid User-Agent will be rejected.

## 6. Data Usage

### Data Source

The Service provides access to data derived from OpenStreetMap notes. This data is:

- Subject to OpenStreetMap's license (ODbL)
- Provided "as-is" without warranty
- Updated periodically based on upstream data sources

### Attribution

When using data from this Service, you must:

- Attribute OpenStreetMap contributors
- Comply with OpenStreetMap's attribution requirements
- Include appropriate attribution in your application

### Data Accuracy

- We strive to provide accurate data but make no guarantees
- Data may be delayed or incomplete
- Report data issues through appropriate channels

## 7. Intellectual Property

### Service Ownership

The OSM Notes API service, including its code, documentation, and infrastructure, is owned by the OSM Notes Team and contributors.

### OpenStreetMap Data

Data provided by the Service is derived from OpenStreetMap and is subject to the Open Database License (ODbL).

### Your Content

You retain ownership of any content you create using the Service, subject to applicable licenses.

## 8. Privacy

Your use of the Service is subject to our Privacy Policy. By using the Service, you consent to:

- Collection of usage statistics
- Logging of requests (IP addresses, User-Agents, timestamps)
- Monitoring for abuse prevention

See `docs/legal/PRIVACY_POLICY.md` for details.

## 9. Service Availability

### No Warranty

The Service is provided "as-is" without warranties of any kind, either express or implied, including but not limited to:

- Availability or uptime guarantees
- Data accuracy or completeness
- Fitness for a particular purpose

### Service Interruptions

We reserve the right to:

- Interrupt the Service for maintenance
- Modify or discontinue the Service
- Implement rate limiting or access restrictions
- Block abusive users or IP addresses

### Scheduled Maintenance

We will attempt to provide advance notice of scheduled maintenance when possible.

## 10. Limitation of Liability

To the maximum extent permitted by law:

- We are not liable for any indirect, incidental, or consequential damages
- Our total liability is limited to the amount you paid to use the Service (currently $0)
- We are not responsible for data loss or corruption
- We are not responsible for third-party services or dependencies

## 11. Indemnification

You agree to indemnify and hold harmless the OSM Notes Team, contributors, and service providers from any claims, damages, or expenses arising from:

- Your use of the Service
- Your violation of these Terms
- Your violation of any rights of another party

## 12. Termination

### By You

You may stop using the Service at any time.

### By Us

We may terminate or suspend your access to the Service immediately, without prior notice, for:

- Violation of these Terms
- Abuse of the Service
- Illegal activity
- Any other reason we deem necessary

## 13. Changes to Terms

We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the new Terms.

**Notification**: Significant changes will be announced via:
- GitHub repository updates
- Service status page (if available)
- Email notification (if you have provided contact information)

## 14. Governing Law

These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.

## 15. Dispute Resolution

Any disputes arising from these Terms or the Service shall be resolved through:

1. Good faith negotiation
2. Mediation (if negotiation fails)
3. Binding arbitration or court proceedings (as applicable)

## 16. Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full effect.

## 17. Entire Agreement

These Terms constitute the entire agreement between you and the OSM Notes Team regarding the Service and supersede all prior agreements.

## 18. Contact Information

For questions about these Terms, please contact:

- **GitHub Issues**: https://github.com/OSM-Notes/OSM-Notes-API/issues
- **Repository**: https://github.com/OSM-Notes/OSM-Notes-API

## 19. Acknowledgment

By using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.

---

**Note**: This is a template Terms of Service. You should review and customize it according to your specific legal requirements and jurisdiction. Consider consulting with a legal professional before using this in production.
