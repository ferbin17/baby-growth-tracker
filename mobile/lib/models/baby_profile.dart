enum Gender { male, female }
enum MeasurementFrequency { weekly, biweekly, monthly }
enum SetupStage { babyDetail, schedule, security, measure, complete }

extension GenderLabel on Gender {
  String get displayName => switch (this) {
    Gender.male => 'Male',
    Gender.female => 'Female',
  };
}

extension MeasurementFrequencyLabel on MeasurementFrequency {
  String get displayName => switch (this) {
    MeasurementFrequency.weekly => 'Weekly',
    MeasurementFrequency.biweekly => 'Biweekly',
    MeasurementFrequency.monthly => 'Monthly',
  };
}

class BabyProfile {
  final int? id;
  final String name;
  final String? username;
  final Gender gender;
  final DateTime birthDate;
  final DateTime? startDate;
  final String passcode;
  final double birthWeightKg;
  final double birthHeightCm;
  final MeasurementFrequency measurementFrequency;
  final SetupStage? stage;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BabyProfile({
    this.id,
    required this.name,
    this.username,
    required this.gender,
    required this.birthDate,
    this.startDate,
    required this.passcode,
    required this.birthWeightKg,
    required this.birthHeightCm,
    required this.measurementFrequency,
    this.stage,
    required this.createdAt,
    required this.updatedAt,
  });

  BabyProfile copyWith({
    int? id,
    String? name,
    String? username,
    Gender? gender,
    DateTime? birthDate,
    DateTime? startDate,
    String? passcode,
    double? birthWeightKg,
    double? birthHeightCm,
    MeasurementFrequency? measurementFrequency,
    SetupStage? stage,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BabyProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      username: username ?? this.username,
      gender: gender ?? this.gender,
      birthDate: birthDate ?? this.birthDate,
      startDate: startDate ?? this.startDate,
      passcode: passcode ?? this.passcode,
      birthWeightKg: birthWeightKg ?? this.birthWeightKg,
      birthHeightCm: birthHeightCm ?? this.birthHeightCm,
      measurementFrequency: measurementFrequency ?? this.measurementFrequency,
      stage: stage ?? this.stage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toRowMap() {
    return {
      if (id != null) 'id': id,
      'name': name,
      if (username != null) 'username': username,
      'gender': gender.name,
      'birth_date': birthDate.toUtc().toIso8601String(),
      if (startDate != null) 'start_date': startDate!.toUtc().toIso8601String(),
      'passcode': passcode,
      'birth_weight_kg': birthWeightKg,
      'birth_height_cm': birthHeightCm,
      'measurement_frequency': measurementFrequency.name,
      if (stage != null) 'stage': stage!.name,
      'created_at': createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  static BabyProfile fromRowMap(Map<String, dynamic> row) {
    return BabyProfile(
      id: row['id'] as int?,
      name: row['name'] as String? ?? '',
      username: row['username'] as String?,
      gender: Gender.values.firstWhere(
        (value) => value.name == (row['gender'] ?? 'female'),
        orElse: () => Gender.female,
      ),
      birthDate: DateTime.parse(row['birth_date'] as String).toLocal(),
      startDate: row['start_date'] != null ? DateTime.parse(row['start_date'] as String).toLocal() : null,
      passcode: row['passcode'] as String? ?? '',
      birthWeightKg: (row['birth_weight_kg'] ?? 0).toDouble(),
      birthHeightCm: (row['birth_height_cm'] ?? 0).toDouble(),
      measurementFrequency: MeasurementFrequency.values.firstWhere(
        (value) => value.name == (row['measurement_frequency'] ?? 'weekly'),
        orElse: () => MeasurementFrequency.weekly,
      ),
      stage: row['stage'] != null
          ? SetupStage.values.firstWhere(
              (value) => value.name == row['stage'],
              orElse: () => SetupStage.complete,
            )
          : null,
      createdAt: DateTime.parse(row['created_at'] as String).toLocal(),
      updatedAt: DateTime.parse(row['updated_at'] as String).toLocal(),
    );
  }

  String get authSafePasscode => passcode;
}
