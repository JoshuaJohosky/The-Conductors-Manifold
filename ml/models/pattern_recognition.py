"""
ML Pattern Recognition for The Conductor's Manifold

Uses neural networks to:
1. Detect manifold patterns (singularity formations, Ricci flows)
2. Predict future singularity events
3. Classify manifold states
4. Learn attractor locations from historical data
"""

import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class PatternPrediction:
    """Container for pattern recognition results"""
    pattern_type: str
    confidence: float
    location: int
    metadata: Dict


class ManifoldLSTM(nn.Module):
    """
    LSTM network for time-series pattern recognition in manifold metrics.

    Learns temporal patterns in curvature, entropy, and tension
    to predict singularity formations.
    """

    def __init__(
        self,
        input_size: int = 5,  # curvature, entropy, tension, price, volume
        hidden_size: int = 128,
        num_layers: int = 3,
        output_size: int = 3,  # singularity_prob, ricci_flow_prob, stable_prob
        dropout: float = 0.2
    ):
        super(ManifoldLSTM, self).__init__()

        self.hidden_size = hidden_size
        self.num_layers = num_layers

        # LSTM layers
        self.lstm = nn.LSTM(
            input_size,
            hidden_size,
            num_layers,
            batch_first=True,
            dropout=dropout
        )

        # Attention mechanism
        self.attention = nn.MultiheadAttention(
            hidden_size,
            num_heads=8,
            dropout=dropout
        )

        # Fully connected layers
        self.fc1 = nn.Linear(hidden_size, 64)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(64, output_size)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        """
        Forward pass.

        Args:
            x: Input tensor of shape (batch, sequence_length, input_size)

        Returns:
            Output probabilities (batch, output_size)
        """
        # LSTM
        lstm_out, (h_n, c_n) = self.lstm(x)

        # Apply attention to LSTM output
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)

        # Take the last time step
        last_hidden = attn_out[:, -1, :]

        # Fully connected layers
        out = self.fc1(last_hidden)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.fc2(out)
        out = self.softmax(out)

        return out


class SingularityPredictor:
    """
    Predicts upcoming singularity events based on manifold metrics.

    Uses trained LSTM to detect early warning signs of singularities.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = ManifoldLSTM().to(self.device)

        if model_path:
            self.load_model(model_path)

        self.model.eval()

    def load_model(self, path: str):
        """Load trained model weights"""
        self.model.load_state_dict(torch.load(path, map_location=self.device))

    def save_model(self, path: str):
        """Save model weights"""
        torch.save(self.model.state_dict(), path)

    def prepare_features(self, metrics) -> np.ndarray:
        """
        Extract features from ManifoldMetrics for model input.

        Args:
            metrics: ManifoldMetrics object

        Returns:
            Feature array of shape (sequence_length, input_size)
        """
        # Normalize features
        curvature_norm = (metrics.curvature - np.mean(metrics.curvature)) / (np.std(metrics.curvature) + 1e-8)
        entropy_norm = (metrics.local_entropy - np.mean(metrics.local_entropy)) / (np.std(metrics.local_entropy) + 1e-8)
        tension_norm = (metrics.tension - np.mean(metrics.tension)) / (np.std(metrics.tension) + 1e-8)
        prices_norm = (metrics.prices - np.mean(metrics.prices)) / (np.std(metrics.prices) + 1e-8)

        # Stack features
        features = np.stack([
            curvature_norm,
            entropy_norm,
            tension_norm,
            prices_norm,
            metrics.ricci_flow
        ], axis=1)

        return features

    def predict(self, metrics, window_size: int = 50) -> Dict[str, float]:
        """
        Predict manifold state probabilities.

        Args:
            metrics: ManifoldMetrics object
            window_size: Number of recent time steps to consider

        Returns:
            Dictionary with probability predictions
        """
        features = self.prepare_features(metrics)

        # Take last window_size points
        if len(features) > window_size:
            features = features[-window_size:]

        # Convert to tensor
        x = torch.FloatTensor(features).unsqueeze(0).to(self.device)

        # Predict
        with torch.no_grad():
            output = self.model(x)

        probs = output.cpu().numpy()[0]

        return {
            'singularity_probability': float(probs[0]),
            'ricci_flow_probability': float(probs[1]),
            'stable_probability': float(probs[2])
        }

    def detect_patterns(self, metrics) -> list[PatternPrediction]:
        """
        Detect all notable patterns in the manifold.

        Returns:
            List of detected patterns with confidence scores
        """
        predictions = []

        # Get probabilities
        probs = self.predict(metrics)

        # Detect singularity formation
        if probs['singularity_probability'] > 0.7:
            predictions.append(PatternPrediction(
                pattern_type="singularity_forming",
                confidence=probs['singularity_probability'],
                location=len(metrics.prices) - 1,
                metadata={"warning": "High probability of extreme event"}
            ))

        # Detect Ricci flow initiation
        if probs['ricci_flow_probability'] > 0.6:
            predictions.append(PatternPrediction(
                pattern_type="ricci_flow_starting",
                confidence=probs['ricci_flow_probability'],
                location=len(metrics.prices) - 1,
                metadata={"message": "Tension redistribution beginning"}
            ))

        return predictions


class AttractorLearner:
    """
    Learns attractor locations from historical price data using
    unsupervised clustering techniques.

    Finds price zones where the manifold naturally stabilizes.
    """

    def __init__(self, n_attractors: int = 5):
        from sklearn.cluster import KMeans
        self.n_attractors = n_attractors
        self.model = KMeans(n_clusters=n_attractors, random_state=42)

    def fit(self, price_history: np.ndarray, volume_history: Optional[np.ndarray] = None):
        """
        Learn attractor locations from historical data.

        Args:
            price_history: Array of historical prices
            volume_history: Optional volume weights
        """
        # Create features: price and optionally volume
        if volume_history is not None:
            X = np.column_stack([price_history, volume_history])
        else:
            X = price_history.reshape(-1, 1)

        # Fit KMeans
        self.model.fit(X)

    def predict_attractors(self) -> list[Tuple[float, float]]:
        """
        Get learned attractor locations.

        Returns:
            List of (price, strength) tuples
        """
        centers = self.model.cluster_centers_[:, 0]  # Extract price dimension
        labels = self.model.labels_

        # Calculate strength based on cluster sizes
        attractors = []
        for i, center in enumerate(centers):
            strength = np.sum(labels == i) / len(labels)
            attractors.append((float(center), float(strength)))

        # Sort by strength
        attractors.sort(key=lambda x: x[1], reverse=True)

        return attractors


class ManifoldAutoencoder(nn.Module):
    """
    Autoencoder for learning compressed representations of manifold states.

    Can detect anomalies (unusual manifold shapes) by reconstruction error.
    """

    def __init__(self, input_dim: int = 100, encoding_dim: int = 16):
        super(ManifoldAutoencoder, self).__init__()

        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, encoding_dim),
            nn.ReLU()
        )

        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim),
            nn.Tanh()
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

    def encode(self, x):
        """Get compressed representation"""
        return self.encoder(x)


class AnomalyDetector:
    """
    Detects anomalous manifold states using autoencoder reconstruction error.
    """

    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = ManifoldAutoencoder().to(self.device)
        self.threshold = None

    def train(self, normal_data: np.ndarray, epochs: int = 100):
        """
        Train on normal manifold states.

        Args:
            normal_data: Array of normal manifold states (N, features)
            epochs: Number of training epochs
        """
        self.model.train()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        criterion = nn.MSELoss()

        X = torch.FloatTensor(normal_data).to(self.device)

        for epoch in range(epochs):
            optimizer.zero_grad()
            reconstructed = self.model(X)
            loss = criterion(reconstructed, X)
            loss.backward()
            optimizer.step()

            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")

        # Set anomaly threshold based on training data
        self.model.eval()
        with torch.no_grad():
            reconstructed = self.model(X)
            errors = torch.mean((reconstructed - X) ** 2, dim=1)
            self.threshold = torch.mean(errors) + 2 * torch.std(errors)

    def is_anomaly(self, data: np.ndarray) -> Tuple[bool, float]:
        """
        Check if data represents an anomalous manifold state.

        Returns:
            (is_anomaly, reconstruction_error)
        """
        self.model.eval()
        X = torch.FloatTensor(data).unsqueeze(0).to(self.device)

        with torch.no_grad():
            reconstructed = self.model(X)
            error = torch.mean((reconstructed - X) ** 2)

        is_anomaly = error > self.threshold if self.threshold else False

        return bool(is_anomaly), float(error)


# Export main classes
__all__ = [
    'ManifoldLSTM',
    'SingularityPredictor',
    'AttractorLearner',
    'ManifoldAutoencoder',
    'AnomalyDetector',
    'PatternPrediction'
]
