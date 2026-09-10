import 'package:flutter/material.dart';

import '../../models/baby_profile.dart';
import '../../services/supabase_service.dart';

class AuthViewModel extends ChangeNotifier {
  final SupabaseService _service = SupabaseService();

  BabyProfile? baby;
  bool isLoading = false;
  String? errorMessage;

  Future<bool> login(String username, String passcode) async {
    if (username.trim().isEmpty || passcode.trim().isEmpty) {
      errorMessage = 'Username and passcode are required.';
      notifyListeners();
      return false;
    }

    isLoading = true;
    errorMessage = null;
    notifyListeners();

    try {
      final result = await _service.login(username.trim(), passcode.trim());

      if (!result.success) {
        errorMessage = result.error;
        notifyListeners();
        return false;
      }

      baby = result.baby;
      return true;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
