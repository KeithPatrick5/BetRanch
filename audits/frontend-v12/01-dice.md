# Dice Frontend QA

Status: Pass

Frontend mapping:
- Uses `/api/bet`.
- Sends `target: diceTarget` and `direction: diceDirection`.
- UI has under/over controls and numeric target input.
- Visual stage shows roll number and slider marker.

Backend match:
- Dice engine expects target and direction.
- Backend tests passed.
