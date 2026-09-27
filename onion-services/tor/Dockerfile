FROM alpine:3.19
RUN apk add --no-cache tor
COPY torrc /etc/tor/torrc
RUN mkdir -p /var/lib/tor/forum_service /var/lib/tor/market_service /var/lib/tor/paste_service && \
    chown -R tor:tor /var/lib/tor && \
    chmod 700 /var/lib/tor/forum_service /var/lib/tor/market_service /var/lib/tor/paste_service
USER tor
ENTRYPOINT ["tor", "-f", "/etc/tor/torrc"]
