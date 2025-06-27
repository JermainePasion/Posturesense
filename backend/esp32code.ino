const int flexPin = 33;

// UPDATE THESE from YOUR measurements:
const int straightReading = 1100;
const int bentReading = 3000;
const float maxAngle = 90.0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🔎 Flex sensor test with angle calculation...");
}

void loop() {
  int flexValue = analogRead(flexPin);

  float angle = mapFlexToAngle(flexValue);

  Serial.print("Flex raw: ");
  Serial.print(flexValue);
  Serial.print(" → Angle: ");
  Serial.print(angle, 1);
  Serial.println("°");

  delay(500);
}

float mapFlexToAngle(int value) {
  float angle = (value - straightReading) * (maxAngle / (bentReading - straightReading));
  if (angle < 0) angle = 0;
  if (angle > maxAngle) angle = maxAngle;
  return angle;
}
