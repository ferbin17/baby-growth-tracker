import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/baby_profile.dart';
import '../models/measurement.dart';

class LoginResult {
  final bool success;
  final BabyProfile? baby;
  final String error;

  const LoginResult({required this.success, this.baby, this.error = ''});
}

class SupabaseService {
  final SupabaseClient client = Supabase.instance.client;

  Future<LoginResult> login(String username, String passcode) async {
    if (username.trim().isEmpty || passcode.trim().isEmpty) {
      return const LoginResult(
        success: false,
        error: 'Username and passcode are required.',
      );
    }

    try {
      final response = await client
          .from('babies')
          .select()
          .or('username.eq.$username,name.eq.$username')
          .eq('passcode', passcode)
          .maybeSingle();

      if (response == null) {
        return const LoginResult(
          success: false,
          error: 'Invalid username or passcode.',
        );
      }

      final baby = BabyProfile.fromRowMap(response);
      return LoginResult(success: true, baby: baby);
    } on PostgrestException {
      return const LoginResult(
        success: false,
        error: 'Unable to login right now. Please try again.',
      );
    } on Exception {
      return const LoginResult(
        success: false,
        error: 'Unable to login right now. Please try again.',
      );
    }
  }

  Future<int> upsertBabyProfile(BabyProfile profile) async {
    final now = DateTime.now();
    final payload = profile.copyWith(
      createdAt: profile.createdAt.isBefore(DateTime.fromMillisecondsSinceEpoch(0)) ? now : profile.createdAt,
      updatedAt: now,
    ).toRowMap();

    final Map<String, dynamic> data;
    if (profile.id != null) {
      final result = await client
          .from('babies')
          .update(payload)
          .eq('id', profile.id!)
          .select()
          .single();
      data = result;
    } else {
      final result = await client.from('babies').insert(payload).select().single();
      data = result;
    }

    final id = data['id'];
    if (id is! int) {
      throw StateError('Baby profile was not saved.');
    }

    return id;
  }

  Future<BabyProfile?> getBabyProfileById(int id) async {
    final response = await client.from('babies').select().eq('id', id).maybeSingle();
    if (response == null) return null;
    return BabyProfile.fromRowMap(response);
  }

  Future<List<Measurement>> getMeasurements(int babyId) async {
    final response = await client
        .from('measurements')
        .select()
        .eq('baby_id', babyId)
        .order('age_days');

    final rows = response as List<dynamic>;
    return rows.map((row) => Measurement.fromRowMap(row as Map<String, dynamic>)).toList();
  }

  Future<void> ensureMeasurementsForBaby(int babyId, BabyProfile baby) async {
    final existing = await getMeasurements(babyId);
    final existingKeys = existing.map((m) => m.date.toUtc().toIso8601String().substring(0, 10)).toSet();

    final today = DateTime.now();
    final birthDate = baby.birthDate;
    DateTime currentDate = baby.startDate ?? birthDate;
    final incrementDays = switch (baby.measurementFrequency) {
      MeasurementFrequency.monthly => 30,
      MeasurementFrequency.biweekly => 14,
      MeasurementFrequency.weekly => 7,
    };

    final missing = <Map<String, dynamic>>[];
    var index = 0;
    var addedUpcoming = false;

    while (index <= 500) {
      final isPastOrToday = currentDate.isBefore(today) || currentDate.isAtSameMomentAs(today);
      final dateKey = currentDate.toUtc().toIso8601String().substring(0, 10);

      if ((isPastOrToday || !addedUpcoming) && !existingKeys.contains(dateKey)) {
        missing.add({
          'baby_id': babyId,
          'date': currentDate.toUtc().toIso8601String(),
          'age_days': currentDate.difference(birthDate).inDays,
          'created_at': DateTime.now().toUtc().toIso8601String(),
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        });
      }

      if (!isPastOrToday) {
        addedUpcoming = true;
        break;
      }

      currentDate = currentDate.add(Duration(days: incrementDays));
      index++;
    }

    if (missing.isEmpty) return;

    await client.from('measurements').insert(missing);
  }

  Future<void> upsertMeasurement(Measurement measurement) async {
    final payload = measurement.copyWith(
      updatedAt: DateTime.now(),
      createdAt: measurement.createdAt,
    ).toRowMap();

    await client.from('measurements').upsert(payload);
  }

  Future<void> deleteMeasurement(int id) async {
    await client.from('measurements').delete().eq('id', id);
  }

  Future<void> deleteMeasurementsForBaby(int babyId) async {
    await client.from('measurements').delete().eq('baby_id', babyId);
  }

  Future<void> deleteBabyProfile(int id) async {
    await deleteMeasurementsForBaby(id);
    await client.from('babies').delete().eq('id', id);
  }

  Future<Measurement?> getLatestCompletedMeasurement(int babyId) async {
    final response = await client
        .from('measurements')
        .select()
        .eq('baby_id', babyId)
        .lte('date', DateTime.now().toUtc().toIso8601String())
        .or('weight_kg.not.is.null,height_cm.not.is.null')
        .order('date', ascending: false)
        .limit(1)
        .maybeSingle();

    if (response == null) return null;
    return Measurement.fromRowMap(response);
  }

  Future<void> createMeasurementsForBaby(int babyId, BabyProfile baby) async {
    final measurements = <Map<String, dynamic>>[];
    final today = DateTime.now();
    final birthDate = baby.birthDate;
    var currentDate = baby.startDate ?? birthDate;
    final incrementDays = switch (baby.measurementFrequency) {
      MeasurementFrequency.monthly => 30,
      MeasurementFrequency.biweekly => 14,
      MeasurementFrequency.weekly => 7,
    };

    var index = 0;
    while (currentDate.isBefore(today) || currentDate.isAtSameMomentAs(today)) {
      measurements.add({
        'baby_id': babyId,
        'date': currentDate.toUtc().toIso8601String(),
        'age_days': currentDate.difference(birthDate).inDays,
        'created_at': DateTime.now().toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });

      currentDate = currentDate.add(Duration(days: incrementDays));
      index++;
      if (index > 500) break;
    }

    if (measurements.isNotEmpty) {
      await client.from('measurements').insert(measurements);
    }
  }

  Future<void> resetMeasurementsForBaby(int babyId, BabyProfile baby) async {
    await client.from('measurements').delete().eq('baby_id', babyId);
    await createMeasurementsForBaby(babyId, baby);
  }

  static String? readSupabaseUrl() => const String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static String? readSupabaseAnonKey() => const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');
}
