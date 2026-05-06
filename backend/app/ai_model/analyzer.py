"""
PowerGrid AI Analyzer
Uses the local Qwen2.5-0.5B model with a strong system prompt
to provide deep predictive maintenance analysis.
"""

from .model_manager import ModelManager
from datetime import datetime, timedelta
import json

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT — Carefully crafted for small model to maximize quality
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are PowerGrid AI, an advanced power grid predictive maintenance system.
You analyze electrical infrastructure sensor data, weather, and component specs.

YOUR ANALYSIS MUST INCLUDE:

1. STATUS: Current health (HEALTHY / DEGRADED / WARNING / CRITICAL / FAILED)
2. RISK SCORE: 0-100 percentage  
3. FAILURE PREDICTION: Probability of failure within 72 hours
4. 3-DAY FORECAST:
   - Day 1: What will likely happen
   - Day 2: Expected changes
   - Day 3: Predicted scenario
5. WEAK POINTS: Specific vulnerabilities found
6. POWER OUTAGE RISK: Probability and affected area
7. MAINTENANCE: Specific actions needed with priority (URGENT/HIGH/MEDIUM/LOW)
8. ROOT CAUSE: Why risk exists
9. IMPACT: What happens if component fails

ANALYSIS RULES:
- Temperature > 75°C on transformer = CRITICAL overheating risk
- Load > 85% sustained = OVERLOAD warning, failure within days
- Load > 95% = IMMINENT failure
- Voltage deviation > 10% from nominal = Grid instability
- High humidity (>80%) + High temp (>60°C) = Accelerated insulation breakdown
- Wind speed > 60 km/h = Physical damage risk to overhead lines
- Rain/Storm conditions = Increased flashover and outage risk
- Component age > 15 years = Higher baseline failure rate

Be specific. Use exact numbers from the data. Provide actionable recommendations.
Format your response clearly with section headers."""

SYSTEM_PROMPT_FULL = """You are PowerGrid AI, analyzing an entire power grid system.
Evaluate all components together to find:

1. SYSTEM HEALTH: Overall grid condition
2. WEAKEST COMPONENTS: Which components are most likely to fail
3. CASCADING FAILURE RISK: If one component fails, what else breaks
4. GRID BOTTLENECKS: Overloaded pathways and connections
5. 3-DAY SYSTEM FORECAST: Grid-wide prediction
6. POWER OUTAGE PROBABILITY: Chance of outage in next 72 hours
7. PRIORITY MAINTENANCE LIST: Ordered list of what to fix first
8. LOAD BALANCING: Suggestions to redistribute load
9. WEATHER IMPACT: How current weather affects the grid

Provide a comprehensive grid-wide analysis. Be specific and data-driven."""


def _format_component_data(component, sensor_data=None, weather_data=None):
    """Format component data into a structured prompt for the AI model."""
    lines = []
    lines.append(f"COMPONENT: {component.get('name', 'Unknown')}")
    lines.append(f"  Type: {component.get('type', 'unknown')}")
    lines.append(f"  ID: {component.get('id', 'N/A')}")
    lines.append(f"  Location: {component.get('lat', 0):.4f}, {component.get('lng', 0):.4f}")
    lines.append(f"  Status: {component.get('status', 'unknown')}")
    lines.append(f"  Capacity: {component.get('capacity', 'N/A')} kVA")

    if sensor_data:
        lines.append(f"  SENSOR DATA:")
        lines.append(f"    Temperature: {sensor_data.get('temperature', 'N/A')}°C")
        lines.append(f"    Voltage: {sensor_data.get('voltage', 'N/A')} V")
        lines.append(f"    Load: {sensor_data.get('load', 'N/A')}%")
        lines.append(f"    Humidity: {sensor_data.get('humidity', 'N/A')}%")
        lines.append(f"    Pressure: {sensor_data.get('pressure', 'N/A')} hPa")
        lines.append(f"    Wind Speed: {sensor_data.get('windSpeed', sensor_data.get('wind_speed', 'N/A'))} m/s")

    if weather_data:
        lines.append(f"  WEATHER AT LOCATION:")
        lines.append(f"    Ambient Temp: {weather_data.get('temperature', 'N/A')}°C")
        lines.append(f"    Humidity: {weather_data.get('humidity', 'N/A')}%")
        lines.append(f"    Wind: {weather_data.get('wind_speed', 'N/A')} m/s")
        lines.append(f"    Conditions: {weather_data.get('conditions', 'N/A')}")
        lines.append(f"    Pressure: {weather_data.get('pressure', 'N/A')} hPa")

    return "\n".join(lines)


def analyze_component(component, sensor_data=None, weather_data=None):
    """
    Analyze a single component using the AI model.
    Returns detailed analysis text.
    """
    mgr = ModelManager.get_instance()

    data_text = _format_component_data(component, sensor_data, weather_data)
    now = datetime.now()

    user_prompt = f"""Analyze this power grid component. Current time: {now.strftime('%Y-%m-%d %H:%M')}.

{data_text}

Provide complete predictive maintenance analysis including 3-day forecast, failure risk, weak points, power outage probability, and specific maintenance recommendations."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    analysis_text = mgr.generate(messages, max_new_tokens=768, temperature=0.6)

    return {
        "component_id": component.get("id", ""),
        "component_name": component.get("name", "Unknown"),
        "component_type": component.get("type", "unknown"),
        "analysis": analysis_text,
        "timestamp": now.isoformat(),
        "sensor_snapshot": sensor_data or {},
        "weather_snapshot": weather_data or {},
        "model": "Qwen2.5-0.5B-Instruct",
    }


def analyze_system(components, sensor_data_map=None, weather_data_map=None, connections=None):
    """
    Analyze the entire grid system.
    components: list of component dicts
    sensor_data_map: dict of component_id -> sensor_data
    weather_data_map: dict of component_id -> weather_data
    connections: list of connection dicts
    """
    mgr = ModelManager.get_instance()

    if not components:
        return {
            "analysis": "No components found in the system. Add components to begin analysis.",
            "timestamp": datetime.now().isoformat(),
        }

    sensor_data_map = sensor_data_map or {}
    weather_data_map = weather_data_map or {}
    connections = connections or []

    # Build system summary
    parts = [f"POWER GRID SYSTEM — {len(components)} components, {len(connections)} connections\n"]

    for comp in components[:20]:  # Limit to 20 for context window
        cid = comp.get("id", "")
        sensor = sensor_data_map.get(cid, {})
        weather = weather_data_map.get(cid, {})
        parts.append(_format_component_data(comp, sensor, weather))
        parts.append("")

    if connections:
        parts.append("CONNECTIONS:")
        for conn in connections[:15]:
            parts.append(f"  {conn.get('fromId', '?')} → {conn.get('toId', '?')} | "
                         f"Type: {conn.get('lineType', '?')} | "
                         f"Capacity: {conn.get('capacityKw', '?')} kW")

    system_text = "\n".join(parts)
    now = datetime.now()

    user_prompt = f"""Analyze this entire power grid system. Time: {now.strftime('%Y-%m-%d %H:%M')}.

{system_text}

Provide complete system-wide analysis: overall health, weakest components, cascading failure risks, 3-day forecast, outage probability, and priority maintenance list."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_FULL},
        {"role": "user", "content": user_prompt},
    ]

    analysis_text = mgr.generate(messages, max_new_tokens=1024, temperature=0.6)

    return {
        "analysis": analysis_text,
        "total_components": len(components),
        "total_connections": len(connections),
        "timestamp": now.isoformat(),
        "model": "Qwen2.5-0.5B-Instruct",
    }
