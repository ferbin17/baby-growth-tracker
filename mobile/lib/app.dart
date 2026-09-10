import 'package:flutter/material.dart';

import 'core/theme.dart';
import 'features/auth/login_screen.dart';

class BabyGrowthTrackerApp extends StatelessWidget {
  const BabyGrowthTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Baby Growth Tracker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
