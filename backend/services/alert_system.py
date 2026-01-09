"""
Alert System for The Conductor's Manifold

Monitors manifold metrics and triggers alerts for critical events:
- Singularity formations
- High tension states
- Ricci flow initiations
- Attractor breaches
"""

import asyncio
from typing import List, Callable, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(Enum):
    """Types of manifold events that trigger alerts"""
    SINGULARITY_DETECTED = "singularity_detected"
    HIGH_TENSION = "high_tension"
    RICCI_FLOW_INITIATED = "ricci_flow_initiated"
    ENTROPY_SPIKE = "entropy_spike"
    ATTRACTOR_REACHED = "attractor_reached"
    ATTRACTOR_BREACHED = "attractor_breached"
    MANIFOLD_STATE_CHANGE = "manifold_state_change"


@dataclass
class Alert:
    """Alert data structure"""
    alert_type: AlertType
    level: AlertLevel
    symbol: str
    timestamp: datetime
    message: str
    data: Dict[str, Any]


class AlertCallback:
    """Base class for alert callbacks"""

    async def handle(self, alert: Alert):
        """Handle an alert"""
        raise NotImplementedError


class ConsoleAlertCallback(AlertCallback):
    """Prints alerts to console"""

    async def handle(self, alert: Alert):
        emoji = {
            AlertLevel.INFO: "ℹ️",
            AlertLevel.WARNING: "⚠️",
            AlertLevel.CRITICAL: "🚨"
        }
        print(f"{emoji[alert.level]} [{alert.timestamp.strftime('%H:%M:%S')}] {alert.symbol} - {alert.message}")


class WebhookAlertCallback(AlertCallback):
    """Sends alerts to a webhook URL"""

    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    async def handle(self, alert: Alert):
        import aiohttp

        payload = {
            "type": alert.alert_type.value,
            "level": alert.level.value,
            "symbol": alert.symbol,
            "timestamp": alert.timestamp.isoformat(),
            "message": alert.message,
            "data": alert.data
        }

        async with aiohttp.ClientSession() as session:
            try:
                await session.post(self.webhook_url, json=payload)
            except Exception as e:
                print(f"Failed to send webhook alert: {e}")


class EmailAlertCallback(AlertCallback):
    """Sends alerts via email (placeholder - implement with SMTP)"""

    def __init__(self, recipients: List[str]):
        self.recipients = recipients

    async def handle(self, alert: Alert):
        # TODO: Implement SMTP email sending
        print(f"[EMAIL] Would send to {self.recipients}: {alert.message}")


class AlertSystem:
    """
    Main alert system that monitors manifold metrics and triggers alerts.
    """

    def __init__(self):
        self.callbacks: List[AlertCallback] = []
        self.alert_history: List[Alert] = []
        self.max_history = 1000
        self.monitoring = False

    def add_callback(self, callback: AlertCallback):
        """Register an alert callback"""
        self.callbacks.append(callback)

    async def trigger_alert(self, alert: Alert):
        """Trigger an alert and notify all callbacks"""
        self.alert_history.append(alert)

        # Trim history
        if len(self.alert_history) > self.max_history:
            self.alert_history = self.alert_history[-self.max_history:]

        # Notify all callbacks
        for callback in self.callbacks:
            try:
                await callback.handle(alert)
            except Exception as e:
                print(f"Alert callback failed: {e}")

    def analyze_metrics(self, symbol: str, metrics) -> List[Alert]:
        """
        Analyze manifold metrics and generate alerts for notable events.

        Args:
            symbol: Trading symbol
            metrics: ManifoldMetrics object

        Returns:
            List of alerts triggered
        """
        alerts = []
        timestamp = datetime.now()

        # Check for singularities
        if metrics.singularities:
            alert = Alert(
                alert_type=AlertType.SINGULARITY_DETECTED,
                level=AlertLevel.CRITICAL,
                symbol=symbol,
                timestamp=timestamp,
                message=f"Singularity detected! {len(metrics.singularities)} extreme tension points found.",
                data={
                    "count": len(metrics.singularities),
                    "indices": metrics.singularities,
                    "timescale": metrics.timescale.value
                }
            )
            alerts.append(alert)

        # Check for high tension
        current_tension = float(metrics.tension[-1])
        if abs(current_tension) > 1.5:
            alert = Alert(
                alert_type=AlertType.HIGH_TENSION,
                level=AlertLevel.WARNING,
                symbol=symbol,
                timestamp=timestamp,
                message=f"High tension detected: {current_tension:.2f}. Correction may be imminent.",
                data={
                    "tension": current_tension,
                    "threshold": 1.5
                }
            )
            alerts.append(alert)

        # Check for entropy spikes
        current_entropy = float(metrics.local_entropy[-1])
        if current_entropy > 7.0:
            alert = Alert(
                alert_type=AlertType.ENTROPY_SPIKE,
                level=AlertLevel.WARNING,
                symbol=symbol,
                timestamp=timestamp,
                message=f"High entropy detected: {current_entropy:.2f}. Market is chaotic.",
                data={
                    "entropy": current_entropy,
                    "threshold": 7.0
                }
            )
            alerts.append(alert)

        # Check for Ricci flow (smoothing events)
        ricci_magnitude = float(abs(metrics.ricci_flow[-1]))
        if ricci_magnitude > 0.5:
            alert = Alert(
                alert_type=AlertType.RICCI_FLOW_INITIATED,
                level=AlertLevel.INFO,
                symbol=symbol,
                timestamp=timestamp,
                message=f"Ricci flow detected. Manifold is smoothing (magnitude: {ricci_magnitude:.2f}).",
                data={
                    "magnitude": ricci_magnitude
                }
            )
            alerts.append(alert)

        # Check distance to nearest attractor
        current_price = float(metrics.prices[-1])
        if metrics.attractors:
            nearest_attractor = min(
                metrics.attractors,
                key=lambda a: abs(a[0] - current_price)
            )
            distance_pct = abs(nearest_attractor[0] - current_price) / current_price * 100

            if distance_pct < 1.0:  # Within 1% of attractor
                alert = Alert(
                    alert_type=AlertType.ATTRACTOR_REACHED,
                    level=AlertLevel.INFO,
                    symbol=symbol,
                    timestamp=timestamp,
                    message=f"Price approaching attractor at ${nearest_attractor[0]:.2f}",
                    data={
                        "attractor_price": nearest_attractor[0],
                        "current_price": current_price,
                        "distance_pct": distance_pct
                    }
                )
                alerts.append(alert)

        return alerts

    async def monitor_symbol(
        self,
        symbol: str,
        data_service,
        manifold_engine,
        feed: str = "binance",
        interval: int = 60
    ):
        """
        Continuously monitor a symbol and trigger alerts.

        Args:
            symbol: Trading symbol to monitor
            data_service: DataIngestionService instance
            manifold_engine: ManifoldEngine instance
            feed: Data feed name
            interval: Check interval in seconds
        """
        self.monitoring = True

        while self.monitoring:
            try:
                # Fetch latest data
                market_data = await data_service.fetch_data(
                    feed, symbol, "1d", 100, use_cache=False
                )
                data_arrays = data_service.to_numpy(market_data)

                # Analyze manifold
                metrics = manifold_engine.analyze(
                    data_arrays['prices'],
                    data_arrays['timestamps'],
                    volume=data_arrays['volume']
                )

                # Check for alert conditions
                alerts = self.analyze_metrics(symbol, metrics)

                # Trigger all alerts
                for alert in alerts:
                    await self.trigger_alert(alert)

            except Exception as e:
                print(f"Monitoring error for {symbol}: {e}")

            # Wait before next check
            await asyncio.sleep(interval)

    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False

    def get_recent_alerts(
        self,
        symbol: Optional[str] = None,
        limit: int = 50
    ) -> List[Alert]:
        """
        Get recent alerts, optionally filtered by symbol.

        Args:
            symbol: Optional symbol filter
            limit: Maximum number of alerts to return

        Returns:
            List of recent alerts
        """
        alerts = self.alert_history
        if symbol:
            alerts = [a for a in alerts if a.symbol == symbol]

        return list(reversed(alerts[-limit:]))


# Global alert system instance
alert_system = AlertSystem()

# Add default console callback
alert_system.add_callback(ConsoleAlertCallback())


# Example usage
async def example_usage():
    """Example of how to use the alert system"""
    from backend.services.data_ingestion import DataIngestionService, BinanceDataFeed
    from backend.core.manifold_engine import ManifoldEngine

    # Setup
    data_service = DataIngestionService()
    data_service.register_feed("binance", BinanceDataFeed())
    engine = ManifoldEngine()

    # Add custom callbacks
    alert_system.add_callback(WebhookAlertCallback("https://your-webhook.com/alerts"))
    alert_system.add_callback(EmailAlertCallback(["trader@example.com"]))

    # Monitor a symbol
    await alert_system.monitor_symbol(
        "BTCUSDT",
        data_service,
        engine,
        feed="binance",
        interval=60
    )


if __name__ == "__main__":
    asyncio.run(example_usage())
