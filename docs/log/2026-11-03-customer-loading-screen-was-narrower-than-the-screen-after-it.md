# 2026-11-03: The customer loading screen drew in the 430 px column, then the page jumped wider

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** While measuring the customer screens at 1280 px for #341, some pages reported a shell width of 430 px when the screen should be 1120 px. Measuring again after a longer wait gave 1120 px every time. In a browser that means a narrow column first, then a jump to the wide layout.
- **Cause:** `CustomerArea` put the `ShellScope` (the customer width) inside `RequireRole`. While `RequireRole` waits for the session it draws a loading screen with `MobileShell`, which is outside the scope and so uses the default 430 px.
- **Fix / workaround:** The scope now wraps `RequireRole`. Any new guard or loading screen for the customer area has to sit inside the `ShellScope` too. Wait for lazy routes before reading a width in a measurement (2.5 s was enough for the mock app).
- **Status:** resolved
- **Refs:** #341, `frontend/src/features/customer/CustomerArea.tsx`.
